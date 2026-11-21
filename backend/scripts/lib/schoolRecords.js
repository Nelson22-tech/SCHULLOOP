// Shared parsing/mapping logic used by both import-schools.js (one file) and import-folder.js
// (many files already saved on disk, e.g. by import-world.js). Keeping this in one place means
// both scripts always treat a row the same way.
const fs = require('fs');
const crypto = require('crypto');

// ---- parsing ----
function parseCsv(text) {
  const rows = []; let row = []; let cell = ''; let quoted = false;
  text = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((v) => v.trim() !== '')) rows.push(row);
      row = [];
    } else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); if (row.some((v) => v.trim() !== '')) rows.push(row); }
  const header = (rows.shift() || []).map((h) => h.trim().toLowerCase());
  return rows.map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] || '').trim()])));
}

function loadRecords(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  if (filePath.toLowerCase().endsWith('.json')) {
    const data = JSON.parse(text);
    const list = Array.isArray(data) ? data : (data.schools || data.records || data.data || []);
    return list.map((o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k.toLowerCase(), v == null ? '' : String(v).trim()])));
  }
  return parseCsv(text);
}

const { classifyLevel, normalizeRaw } = require('./levelClassifier');
const pick = (r, keys) => { for (const k of keys) if (r[k]) return r[k]; return ''; };

const normalizeLevel = normalizeRaw;

const norm = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

function toSchool(r, sourceLabel) {
  const name = pick(r, ['name', 'school_name', 'school', 'institution', 'institution_name']);
  if (!name) return null;
  const country = pick(r, ['country', 'country_name', 'nation']);
  const region = pick(r, ['region', 'state', 'province', 'admin1', 'county']);
  const city = pick(r, ['city', 'town', 'locality', 'municipality', 'village']);
  const lat = parseFloat(pick(r, ['latitude', 'lat', 'y']));
  const lng = parseFloat(pick(r, ['longitude', 'lon', 'lng', 'long', 'x']));
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && (lat !== 0 || lng !== 0);
  const rawId = pick(r, ['id', 'external_id', 'school_id', 'unesco_id', 'osm_id', 'ncessch', 'urn']);
  const externalId = rawId || 'h_' + crypto.createHash('sha1').update([norm(name), norm(city), norm(country)].join('|')).digest('hex').slice(0, 20);
  const doc = {
    name, country, region, city,
    location: [city, region, country].filter(Boolean).join(', '),
    type: classifyLevel({ name, country, raw: pick(r, ['level', 'education_level', 'type', 'category', 'school_type']) }).level,
    source: 'imported', verificationStatus: 'unverified', verified: false,
    externalId: String(externalId), dataSource: sourceLabel,
  };
  if (hasCoords) { doc.latitude = lat; doc.longitude = lng; doc.geo = { type: 'Point', coordinates: [lng, lat] }; }
  return doc;
}


module.exports = { parseCsv, loadRecords, toSchool, normalizeLevel, norm, pick };
