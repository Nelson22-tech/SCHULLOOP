// Downloads school data from OpenStreetMap for many countries, one at a time, and imports each
// one as soon as it's converted - so progress is saved even if the run is stopped partway through.
//
// Needs internet access and Node 18 or newer (for the built-in fetch). Run from the backend folder:
//
//   node scripts/import-world.js --dry-run                # test run, writes nothing to the DB
//   node scripts/import-world.js                            # real run, all 163 listed countries
//   node scripts/import-world.js --only "Cameroon,Nigeria,Ghana"   # just these countries
//   node scripts/import-world.js --continue-from Kenya      # resume a run that stopped partway
//
// This can take many HOURS for the full list, because we deliberately wait between requests so we
// don't overload the free Overpass API (see https://overpass-api.de/ - fair-use policy). Countries
// with a lot of OSM data (USA, India, Brazil...) may time out; the script logs and skips them so
// the rest of the list keeps going. Re-run with --only "<the countries that failed>" afterwards.
//
// Data (c) OpenStreetMap contributors, ODbL. Keep this attribution in your app.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { convert, csvCell } = require('./osm-to-csv.js');

// If this network needs a proxy for internet access, Chrome/Windows picks it up automatically but
// Node.js does not, unless we set it up explicitly. Set HTTPS_PROXY (or HTTP_PROXY) before running
// this script, e.g. in PowerShell: $env:HTTPS_PROXY = "http://your-proxy:port"
const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy;
if (proxyUrl) {
  try {
    const { setGlobalDispatcher, ProxyAgent } = require('undici');
    setGlobalDispatcher(new ProxyAgent(proxyUrl));
    console.log(`Using proxy from environment: ${proxyUrl}`);
  } catch {
    console.error('HTTPS_PROXY/HTTP_PROXY is set, but the "undici" package needed to use it is not installed.');
    console.error('Run "npm install" in the backend folder (it is now listed in package.json), then try again.');
    process.exit(1);
  }
}

// Two mirrors, tried in order. If the first rejects or errors, we fall back to the second.
const OVERPASS_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];
const WAIT_BETWEEN_COUNTRIES_MS = 8000; // be polite to the free shared server
const FETCH_TIMEOUT_MS = 4 * 60 * 1000;

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const dryRun = args.includes('--dry-run');
const checkNetwork = args.includes('--check-network');
const onlyList = opt('--only');
const continueFrom = opt('--continue-from');

const allCountries = JSON.parse(fs.readFileSync(path.join(__dirname, 'countries.json'), 'utf8'));
let countries = allCountries;
if (onlyList) {
  const names = onlyList.split(',').map((s) => s.trim().toLowerCase());
  countries = allCountries.filter((c) => names.includes(c.name.toLowerCase()));
  if (countries.length === 0) { console.error('No matching countries in countries.json for --only'); process.exit(1); }
} else if (continueFrom) {
  const i = allCountries.findIndex((c) => c.name.toLowerCase() === continueFrom.toLowerCase());
  if (i === -1) { console.error(`"${continueFrom}" not found in countries.json`); process.exit(1); }
  countries = allCountries.slice(i);
}

const dataDir = path.join(__dirname, '..', 'data', 'world');
fs.mkdirSync(dataDir, { recursive: true });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchCountry(iso2) {
  const query = `[out:json][timeout:250];area["ISO3166-1"="${iso2}"][admin_level=2]->.c;nwr["amenity"~"^(school|kindergarten|college|university)$"](area.c);out center tags;`;
  let lastError;
  for (const url of OVERPASS_URLS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        method: 'POST',
        body: 'data=' + encodeURIComponent(query),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          // Some Overpass mirrors reject requests with no User-Agent/Accept (HTTP 406/403).
          'User-Agent': 'Schulloop-import-world/1.0 (school data import script)',
          Accept: '*/*',
        },
        signal: controller.signal,
      });
      const bodyText = await response.text();
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}${bodyText ? ' - ' + bodyText.slice(0, 200) : ''}`);
      }
      const looksLikeHtml = /^\s*(<!DOCTYPE|<html)/i.test(bodyText);
      if (looksLikeHtml) {
        // A 200 OK that isn't JSON almost always means something between this computer and
        // Overpass replaced the response - a firewall, antivirus HTTPS/web filter, school or
        // office network filter, or a captive portal login page. Retrying won't fix this; the
        // network needs to be checked (see HOW_TO_ADD_A_COUNTRY.md).
        throw new Error('Got a webpage instead of data - something on this network (firewall, antivirus web filter, or captive portal) is likely blocking or intercepting the request.');
      }
      try {
        return JSON.parse(bodyText);
      } catch {
        throw new Error(`Response was not valid JSON (first 200 chars): ${bodyText.slice(0, 200)}`);
      }
    } catch (error) {
      lastError = error;
      // try the next mirror
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

async function main() {
  if (checkNetwork) {
    // A plain GET, with the same client this script uses for real downloads, so we can tell
    // whether the problem is specific to this script/Node or affects this network generally.
    console.log('Checking connection to Overpass (plain GET, same as your browser test)...');
    try {
      const response = await fetch('https://overpass-api.de/api/status', {
        headers: { 'User-Agent': 'Schulloop-import-world/1.0 (school data import script)', Accept: '*/*' },
      });
      const bodyText = await response.text();
      console.log(`HTTP status: ${response.status}`);
      console.log('Body (first 300 chars):');
      console.log(bodyText.slice(0, 300));
      if (/^\s*(<!DOCTYPE|<html)/i.test(bodyText)) {
        console.log('\n=> This looks like an HTML page, not the plain text Overpass normally returns.');
        console.log('   That confirms something is intercepting requests from this script/Node specifically');
        console.log('   (a proxy this network requires, or antivirus/firewall app-level filtering).');
      } else if (response.ok) {
        console.log('\n=> This looks like a normal Overpass response. A plain GET from Node works fine.');
        console.log('   If the real import still fails, the issue is specific to the POST request it sends -');
        console.log('   try running with --only for a single small country and share the exact error.');
      }
    } catch (error) {
      console.log(`Request failed outright: ${error.message}`);
      console.log('=> Node could not reach the server at all. If a proxy is required on this network, set');
      console.log('   HTTPS_PROXY as shown near the top of this script and try --check-network again.');
    }
    return;
  }

  console.log(`Processing ${countries.length} countries. ${dryRun ? '(dry run - nothing will be saved)' : ''}`);
  const summary = [];

  for (const { name, iso2 } of countries) {
    process.stdout.write(`\n${name} (${iso2}): downloading... `);
    let data;
    try {
      data = await fetchCountry(iso2);
    } catch (error) {
      console.log(`FAILED (${error.message}) - skipping`);
      summary.push({ name, status: 'download failed', detail: error.message });
      await sleep(WAIT_BETWEEN_COUNTRIES_MS);
      continue;
    }

    const { rows, stats } = convert(data, name);
    console.log(`${stats.total} elements, ${rows.length - 1} usable schools`);

    if (rows.length <= 1) {
      summary.push({ name, status: 'no schools found' });
      await sleep(WAIT_BETWEEN_COUNTRIES_MS);
      continue;
    }

    const csvPath = path.join(dataDir, `${iso2.toLowerCase()}.csv`);
    fs.writeFileSync(csvPath, rows.map((r) => r.map(csvCell).join(',')).join('\n') + '\n');

    if (dryRun) {
      summary.push({ name, status: `would import ${rows.length - 1}` });
    } else {
      try {
        const importScript = path.join(__dirname, 'import-schools.js');
        const output = execFileSync('node', [importScript, csvPath, '--source', 'OpenStreetMap contributors (ODbL)'], { encoding: 'utf8' });
        process.stdout.write(output);
        summary.push({ name, status: `imported ${rows.length - 1}` });
      } catch (error) {
        console.log(`IMPORT FAILED: ${error.message}`);
        summary.push({ name, status: 'import failed', detail: error.message });
      }
    }

    await sleep(WAIT_BETWEEN_COUNTRIES_MS);
  }

  console.log('\n\n=== Summary ===');
  for (const row of summary) console.log(`${row.name}: ${row.status}${row.detail ? ' - ' + row.detail : ''}`);
  const failed = summary.filter((r) => r.status.includes('failed'));
  if (failed.length) {
    console.log(`\nTo retry just the failed ones:\n  node scripts/import-world.js --only "${failed.map((f) => f.name).join(',')}"`);
  }
}

main();
