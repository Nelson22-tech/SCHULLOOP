// Converts an OpenStreetMap (Overpass API) JSON export of schools into the CSV format
// used by `npm run import-schools`.
//
// Usage (from the backend folder):
//   node scripts/osm-to-csv.js data/cameroon-osm.json --country Cameroon --out data/cameroon-schools.csv
//   npm run import-schools -- data/cameroon-schools.csv --source "OpenStreetMap contributors (ODbL)"
//
// How to get the JSON: see backend/data/HOW_TO_ADD_A_COUNTRY.md
//
// Data (c) OpenStreetMap contributors, ODbL. Keep the attribution in your app/about page.
const fs = require('fs');
const { classifyLevel } = require('./lib/levelClassifier');
const path = require('path');

function runCli() {
  const args = process.argv.slice(2);
  const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
  const file = args.find((a, i) => !a.startsWith('--') && !['--country', '--out'].includes(args[i - 1]));
  const country = opt('--country') || '';
  const outFile = opt('--out') || (file ? file.replace(/\.json$/i, '') + '-schools.csv' : 'schools.csv');

  if (!file || !country) {
    console.error('Usage: node scripts/osm-to-csv.js <overpass.json> --country "Cameroon" [--out schools.csv]');
    process.exit(1);
  }
  const { rows, stats } = convert(JSON.parse(fs.readFileSync(path.resolve(file), 'utf8')), country);
  fs.writeFileSync(path.resolve(outFile), rows.map((r) => r.map(csvCell).join(',')).join('\n') + '\n');
  console.log(`Elements read: ${stats.total}`);
  console.log(`Schools written: ${rows.length - 1} -> ${outFile}`);
  console.log(`Skipped: ${stats.unnamed} without a name, ${stats.noCoords} without coordinates.`);
  if (stats.guessedCity) console.log(`${stats.guessedCity} schools had no city tag; labelled with the nearest main town within 15 km (approximate).`);
}

// Approximate fallback used ONLY for Cameroon when OSM has no city/town tag on a school:
// we label it with the nearest main town within 15 km. Regions are the 10 regions of Cameroon.
const CM_TOWNS = [
  ['Yaounde', 'Centre', 3.848, 11.502], ['Douala', 'Littoral', 4.051, 9.768], ['Buea', 'South-West', 4.153, 9.243],
  ['Limbe', 'South-West', 4.024, 9.207], ['Kumba', 'South-West', 4.636, 9.446], ['Tiko', 'South-West', 4.075, 9.360],
  ['Mamfe', 'South-West', 5.767, 9.281], ['Bamenda', 'North-West', 5.959, 10.146], ['Kumbo', 'North-West', 6.203, 10.683],
  ['Bafoussam', 'West', 5.478, 10.418], ['Dschang', 'West', 5.444, 10.053], ['Foumban', 'West', 5.727, 10.899],
  ['Nkongsamba', 'Littoral', 4.955, 9.940], ['Edea', 'Littoral', 3.800, 10.133], ['Kribi', 'South', 2.940, 9.910],
  ['Ebolowa', 'South', 2.900, 11.150], ['Bertoua', 'East', 4.577, 13.684], ['Ngaoundere', 'Adamawa', 7.322, 13.584],
  ['Garoua', 'North', 9.301, 13.393], ['Maroua', 'Far North', 10.591, 14.316],
];

function km(aLat, aLng, bLat, bLng) {
  const r = 6371, d = Math.PI / 180;
  const dLat = (bLat - aLat) * d, dLng = (bLng - aLng) * d;
  const v = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * d) * Math.cos(bLat * d) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(v), Math.sqrt(1 - v));
}

function nearestTown(lat, lng) {
  let best = null;
  for (const t of CM_TOWNS) {
    const dist = km(lat, lng, t[2], t[3]);
    if (!best || dist < best.dist) best = { city: t[0], region: t[1], dist };
  }
  return best && best.dist <= 15 ? best : null;
}

function level(tags, country) {
  const name = (tags.name || '') + ' ' + (tags['name:en'] || '') + ' ' + (tags['name:fr'] || '');
  const isced = String(tags['isced:level'] || '');
  let raw = '';
  if (tags.amenity === 'university') raw = 'university';
  else if (tags.amenity === 'kindergarten' || /(^|;)0(;|$)/.test(isced)) raw = 'nursery';
  else if (/(^|;)1(;|$)/.test(isced)) raw = 'primary';
  else if (/(^|;)[23](;|$)/.test(isced)) raw = 'secondary';
  else if (/(^|;)[5-8](;|$)/.test(isced)) raw = 'university';
  else if (tags.amenity === 'college') raw = 'college';
  return classifyLevel({ name, raw, country }).level;
}

const csvCell = (v) => {
  const s = String(v ?? '');
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};

// Converts one Overpass JSON payload into CSV rows for a given country.
// Returns { rows, stats } - rows[0] is the header. Reused by osm-to-csv CLI and import-world.js.
function convert(data, country) {
  const elements = Array.isArray(data.elements) ? data.elements : [];
  const rows = [['id', 'name', 'country', 'region', 'city', 'level', 'latitude', 'longitude']];
  let unnamed = 0, noCoords = 0, guessedCity = 0;
  const seen = new Set();

  for (const el of elements) {
  const tags = el.tags || {};
  const name = (tags.name || tags['name:en'] || tags['name:fr'] || '').trim();
  if (!name) { unnamed++; continue; }
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) { noCoords++; continue; }
  const id = `osm_${el.type}_${el.id}`;
  if (seen.has(id)) continue;
  seen.add(id);

  let city = tags['addr:city'] || tags['addr:town'] || tags['addr:village'] || tags['addr:suburb'] || tags['addr:place'] || '';
  let region = tags['addr:state'] || tags['addr:province'] || tags['addr:region'] || '';
  if (!city && /^cameroon$/i.test(country)) {
    const t = nearestTown(lat, lng);
    if (t) { city = t.city; region = region || t.region; guessedCity++; }
  }
  if (!region && city && /^cameroon$/i.test(country)) {
    const norm = (x) => x.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
    const known = CM_TOWNS.find((t) => norm(t[0]) === norm(city));
    if (known) region = known[1];
  }
    rows.push([id, name, country, region, city, level(tags, country), lat.toFixed(6), lng.toFixed(6)]);
  }
  return { rows, stats: { total: elements.length, unnamed, noCoords, guessedCity } };
}

module.exports = { convert, csvCell, level };
if (require.main === module) runCli();
