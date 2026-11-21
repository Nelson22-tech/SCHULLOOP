// Re-checks the education level (Nursery / Primary / Secondary / University) of imported schools worldwide,
// using the school's name and country. Claimed or verified schools are never changed.
//
//   npm run fix-levels -- --dry-run     show what would change, write nothing
//   npm run fix-levels                  apply the changes
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { classifyLevel } = require('./lib/levelClassifier');

const dryRun = process.argv.includes('--dry-run');
if (!process.env.MONGO_URI) { console.error('MONGO_URI is required (backend/.env).'); process.exit(1); }

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const schools = mongoose.connection.collection('schools');
  const cursor = schools.find({ source: 'imported', verified: { $ne: true }, claimedBy: null }, { projection: { name: 1, country: 1, type: 1 } });
  const counts = {}; const samples = []; let ops = []; let changed = 0; let seen = 0;
  for await (const s of cursor) {
    seen += 1;
    const r = classifyLevel({ name: s.name, raw: s.type, country: s.country });
    const level = r.confident ? r.level : (r.ambiguous && s.type === 'University' ? 'Secondary' : s.type);
    if (!level || level === s.type) continue;
    changed += 1; const key = `${s.type || '(none)'} -> ${level}`; counts[key] = (counts[key] || 0) + 1;
    if (samples.length < 15) samples.push(`${s.name} (${s.country || '?'}): ${key}`);
    ops.push({ updateOne: { filter: { _id: s._id }, update: { $set: { type: level } } } });
    if (ops.length >= 1000 && !dryRun) { await schools.bulkWrite(ops); ops = []; }
  }
  if (ops.length && !dryRun) await schools.bulkWrite(ops);
  console.log(`${dryRun ? '[dry run] ' : ''}Checked ${seen} imported schools, ${changed} ${dryRun ? 'would change' : 'changed'}.`);
  Object.entries(counts).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
  samples.forEach((l) => console.log(`  e.g. ${l}`));
  await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
