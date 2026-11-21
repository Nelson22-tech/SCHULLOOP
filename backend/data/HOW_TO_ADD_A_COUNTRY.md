# Add all schools of a country (example: Cameroon)

You need Node installed and your backend `.env` working (MONGO_URI). Run every command from the `backend` folder.

## 1. Download the school data from OpenStreetMap

1. Open https://overpass-turbo.eu
2. Paste this query and click **Run**:

```
[out:json][timeout:300];
area["ISO3166-1"="CM"][admin_level=2]->.country;
nwr["amenity"~"^(school|kindergarten|college|university)$"](area.country);
out center tags;
```

3. When it finishes: **Export** -> under *Data* choose **raw OSM data** -> **download**.
4. Save the file as `backend/data/cameroon-osm.json`.

(Other country? Change `"CM"` to its ISO 3166-1 code, e.g. `"NG"` Nigeria, `"GH"` Ghana, `"KE"` Kenya.
If the query times out, run it again later or ask for one region at a time.)

## 2. Convert to the import format

```
npm run osm-to-csv -- data/cameroon-osm.json --country Cameroon --out data/cameroon-schools.csv
```

## 3. Preview, then import

```
npm run import-schools -- data/cameroon-schools.csv --dry-run
npm run import-schools -- data/cameroon-schools.csv --source "OpenStreetMap contributors (ODbL)"
```

Safe to re-run: existing imported schools are updated, never duplicated, and schools that were
claimed or verified are never overwritten.

## Notes

- Imported schools are **unverified**: they appear in search and "near you", but their full profile stays locked
  until the school is claimed and an admin verifies it.
- OpenStreetMap coverage is not complete. Schools nobody has mapped are missing, and unnamed ones are skipped.
  You can add missing schools manually, or import extra CSV files from other sources with the same command.
- OpenStreetMap data is (c) OpenStreetMap contributors under the ODbL licence. Show that credit somewhere in
  the app (for example on the Settings or About screen).

## Doing this for every country at once

Instead of running the steps above once per country, `scripts/import-world.js` loops through a
built-in list of ~160 countries: it downloads each one from OpenStreetMap, converts it, and
imports it immediately, one country at a time, waiting a few seconds between each to stay within
Overpass's fair-use limits.

From the `backend` folder:

```
npm run import-world -- --dry-run                                  # test run, saves nothing
npm run import-world                                                # real run, all countries
npm run import-world -- --only "Cameroon,Nigeria,Ghana"             # just these countries
npm run import-world -- --continue-from Kenya                       # resume after a stop
```

Requires Node 18+ and internet access. **This can take several hours** for the full list, because
of the deliberate delay between countries and because Overpass can be slow for large countries. If
a country times out or fails, the script logs it, keeps going with the rest, and prints a ready-made
`--only "..."` command at the end to retry just the ones that failed.

## "Got a webpage instead of data" / raw HTML in the terminal

This means something between your computer and Overpass replaced the response with a webpage
instead of returning data - the request itself is being intercepted, not failing on the Overpass
side. Common causes: antivirus HTTPS/web-filtering, a school or office network filter, or a
captive portal that hasn't been "logged into" yet.

To check:
1. Open this exact link in your normal web browser: https://overpass-api.de/api/status
   - If you get a short block of plain text (not an error page, not a login page), the network is fine and the issue is something specific to how the terminal/script connects (less common - tell me what you see).
   - If you get a warning page, a login page, or nothing loads, your network or antivirus is blocking it.
2. Try the same command on a different network (e.g. a phone's mobile hotspot). If it works there, the problem is confirmed to be local network/antivirus, not the script.
3. If your antivirus has an "HTTPS scanning" or "web shield" feature, try temporarily disabling it and running the import again.

## Diagnosing connection problems

If a country download fails or shows "Got a webpage instead of data", run:

```
node scripts/import-world.js --check-network
```

This sends one simple test request (the same way your browser test worked) and tells you plainly
what happened:
- **Normal Overpass response** - the connection itself is fine; if imports still fail, share the
  exact error text.
- **An HTML page came back** - something is intercepting requests specifically from this script/Node
  (not from your browser). This is usually either a proxy this network requires (see below) or an
  antivirus/firewall rule that treats Node differently from a browser.
- **The request failed outright** (e.g. "ENOTFOUND") - Node could not reach the server at all.

### If this network requires a proxy

Chrome and Windows can pick up a network's required proxy automatically; Node.js does not, unless
told to. If your IT department or network settings mention a proxy address, set it before running
the script (from the backend folder):

PowerShell:
```
$env:HTTPS_PROXY = "http://your-proxy-address:port"
npm run import-world -- --check-network
```

Command Prompt:
```
set HTTPS_PROXY=http://your-proxy-address:port
npm run import-world -- --check-network
```

This needs the `undici` package, which is now listed in `package.json` - run `npm install` once
in the backend folder to fetch it if you haven't already since this was added.

## Importing files you already downloaded (no re-downloading)

If you already ran `import-world.js` before and have `.csv` files sitting in `backend/data/world/`
(or anywhere else), you don't need to re-download anything to import them, or import them one by
one. `import-folder.js` imports every `.csv`/`.json` file in a folder in a single run:

```
npm run import-folder -- data/world --dry-run     # preview everything first
npm run import-folder -- data/world                # the real import
```

This is faster than re-running `import-world.js`, since it connects to the database once instead
of once per country, and it works even with no internet connection, since it only reads files
already on disk. It's safe to re-run any time - schools that already exist get updated instead of
duplicated, and anything claimed or verified is never touched.
