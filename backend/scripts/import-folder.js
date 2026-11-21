// Imports every already-downloaded CSV/JSON school file in a folder - in ONE database connection,
// instead of running import-schools.js separately for each file. Use this for files you (or
// import-world.js) already saved to disk; it does not download anything itself.
//
// Usage (from the backend folder):
//   npm run import-folder -- data/world              # every .csv/.json file in that folder
//   npm run import-folder -- data/world --dry-run     # preview only, writes nothing
//   npm run import-folder -- data/world --source "OpenStreetMap contributors (ODbL)"
//
// Each file's own name (without the extension) is used as its "dataSource" label unless --source
// is given, so you can tell later which file/dataset a school came from.
// Safe to re-run: same matching rules as import-schools.js - claimed/verified schools are never
// touched, and re-importing just updates existing unverified records instead of duplicating them.
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { loadRecords, toSchool, norm } = require('./lib/schoolRecords');

const args = process.argv.slice(2);
const sourceIdx = args.indexOf('--source');
const sourceOverride = sourceIdx >= 0 ? args[sourceIdx + 1] : null;
const folder = args.find((a, i) => !a.startsWith('--') && !(sourceIdx >= 0 && i === sourceIdx + 1));
const dryRun = args.includes('--dry-run');
const BATCH = 1000;

if (!folder) {
  console.error('Usage: npm run import-folder -- <folder> [--source "label"] [--dry-run]');
  process.exit(1);
}
if (!process.env.MONGO_URI && !dryRun) {
  console.error('MONGO_URI is required (backend/.env).');
  process.exit(1);
}

const folderPath = path.resolve(folder);
const files = fs.readdirSync(folderPath)
  .filter((f) => /\.(csv|json)$/i.test(f))
  .sort();

if (files.length === 0) {
  console.log(`No .csv or .json files found in ${folderPath}`);
  process.exit(0);
}

async function main() {
  console.log(`Found ${files.length} file(s) in ${folderPath}${dryRun ? ' (dry run - nothing will be saved)' : ''}`);

  // Read + parse every file up front so we can report totals before touching the database.
  const perFile = [];
  let grandTotal = 0;
  for (const file of files) {
    const label = sourceOverride || path.basename(file, path.extname(file));
    const records = loadRecords(path.join(folderPath, file));
    const seen = new Set();
    const docs = [];
    for (const r of records) {
      const d = toSchool(r, label);
      if (!d || seen.has(d.externalId)) continue;
      seen.add(d.externalId);
      docs.push(d);
    }
    perFile.push({ file, label, docs });
    grandTotal += docs.length;
    console.log(`  ${file}: ${records.length} rows -> ${docs.length} usable schools`);
  }
  console.log(`Total usable across all files: ${grandTotal}`);

  if (dryRun) {
    console.log('Dry run - nothing written.');
    return;
  }

  await mongoose.connect(process.env.MONGO_URI);
  const School = mongoose.connection.collection('schools');
  // Loaded once and reused for every file, instead of re-querying per country.
  const platform = await School.find({ source: { $ne: 'imported' } }, { projection: { name: 1, city: 1, country: 1 } }).toArray();
  const platformKeys = new Set(platform.map((s) => [norm(s.name), norm(s.city), norm(s.country)].join('|')));

  let totalInserted = 0, totalUpdated = 0, totalProtected = 0, totalDuplicates = 0;

  for (const { file, docs } of perFile) {
    if (docs.length === 0) continue;
    let inserted = 0, updated = 0, protectedCount = 0, duplicates = 0;
    for (let i = 0; i < docs.length; i += BATCH) {
      const batch = docs.slice(i, i + BATCH);
      const existing = await School.find(
        { source: 'imported', externalId: { $in: batch.map((d) => d.externalId) } },
        { projection: { externalId: 1, verificationStatus: 1 } }
      ).toArray();
      const existingMap = new Map(existing.map((e) => [e.externalId, e.verificationStatus]));
      const ops = [];
      for (const d of batch) {
        if (platformKeys.has([norm(d.name), norm(d.city), norm(d.country)].join('|'))) { duplicates++; continue; }
        if (existingMap.has(d.externalId)) {
          if (existingMap.get(d.externalId) !== 'unverified') { protectedCount++; continue; }
          const { verificationStatus, verified, source, ...basic } = d;
          ops.push({ updateOne: { filter: { source: 'imported', externalId: d.externalId, verificationStatus: 'unverified' }, update: { $set: { ...basic, updatedAt: new Date() } } } });
          updated++;
        } else {
          const now = new Date();
          ops.push({ insertOne: { document: {
            rating: 0, fees: null, currency: 'USD', studentCount: 0, staffCount: 0, description: '', imageUrl: '', logoUrl: '',
            phone: '', email: '', website: '', contactPerson: '', virtualTourUrl: '', facilities: [], programs: [], admissionRequirements: [],
            claimedBy: null, ...d, createdAt: now, updatedAt: now,
          } } });
          inserted++;
        }
      }
      if (ops.length) await School.bulkWrite(ops, { ordered: false });
    }
    console.log(`  ${file}: inserted ${inserted}, updated ${updated}, kept ${protectedCount} claimed/verified untouched, skipped ${duplicates} already on platform.`);
    totalInserted += inserted; totalUpdated += updated; totalProtected += protectedCount; totalDuplicates += duplicates;
  }

  console.log(`\nDone. Inserted ${totalInserted}, updated ${totalUpdated}, kept ${totalProtected} claimed/verified untouched, skipped ${totalDuplicates} already on platform.`);
  await School.createIndex({ geo: '2dsphere' });
  await School.createIndex({ country: 1, region: 1, city: 1 });
  await School.createIndex({ source: 1, externalId: 1 });
  await mongoose.disconnect();
}

main().catch((err) => { console.error('Import failed:', err.message); process.exit(1); });
