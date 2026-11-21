// Imports a global school dataset (CSV or JSON) into the `schools` collection as UNVERIFIED listings.
//
// Usage (from the backend folder):
//   npm run import-schools -- data/sample-schools.csv
//   npm run import-schools -- path/to/dataset.csv --source "Dataset name + licence"
//   npm run import-schools -- path/to/dataset.json --dry-run
//
// Safe to re-run: records are matched by (source=imported, externalId), and schools that have
// been claimed or verified are NEVER overwritten. Imported schools only carry basic fields.
// Check the dataset licence and attribution rules before commercial use.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const args = process.argv.slice(2);
const sourceIdx = args.indexOf('--source');
const sourceLabel = sourceIdx >= 0 && args[sourceIdx + 1] ? args[sourceIdx + 1] : 'global-dataset';
const file = args.find((a, i) => !a.startsWith('--') && !(sourceIdx >= 0 && i === sourceIdx + 1));
const dryRun = args.includes('--dry-run');
const BATCH = 1000;

if (!file) { console.error('Usage: npm run import-schools -- <file.csv|file.json> [--source "label"] [--dry-run]'); process.exit(1); }
if (!process.env.MONGO_URI && !dryRun) { console.error('MONGO_URI is required (backend/.env).'); process.exit(1); }

const { loadRecords, toSchool, norm } = require('./lib/schoolRecords');

async function main() {
  const records = loadRecords(path.resolve(file));
  const seen = new Set(); const docs = [];
  let skipped = 0;
  for (const r of records) {
    const d = toSchool(r, sourceLabel);
    if (!d || seen.has(d.externalId)) { skipped++; continue; }
    seen.add(d.externalId); docs.push(d);
  }
  console.log(`Read ${records.length} rows -> ${docs.length} usable, ${skipped} skipped (missing name or duplicate id).`);
  if (dryRun) { console.log('Dry run - nothing written. Sample:', docs.slice(0, 3)); return; }

  await mongoose.connect(process.env.MONGO_URI);
  const School = mongoose.connection.collection('schools');
  // Do not import a school that already exists on the platform (same name + city + country).
  const platform = await School.find({ source: { $ne: 'imported' } }, { projection: { name: 1, city: 1, country: 1 } }).toArray();
  const platformKeys = new Set(platform.map((s) => [norm(s.name), norm(s.city), norm(s.country)].join('|')));

  let inserted = 0, updated = 0, protectedCount = 0, duplicates = 0;
  for (let i = 0; i < docs.length; i += BATCH) {
    const batch = docs.slice(i, i + BATCH);
    const existing = await School.find({ source: 'imported', externalId: { $in: batch.map((d) => d.externalId) } },
      { projection: { externalId: 1, verificationStatus: 1 } }).toArray();
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
    process.stdout.write(`\rProcessed ${Math.min(i + BATCH, docs.length)}/${docs.length}`);
  }
  console.log(`\nDone. Inserted ${inserted}, updated ${updated}, kept ${protectedCount} claimed/verified untouched, skipped ${duplicates} already on platform.`);
  // Make sure indexes exist (2dsphere for nearby search).
  await School.createIndex({ geo: '2dsphere' });
  await School.createIndex({ country: 1, region: 1, city: 1 });
  await School.createIndex({ source: 1, externalId: 1 });
  await mongoose.disconnect();
}

main().catch((err) => { console.error('Import failed:', err.message); process.exit(1); });
