const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoUri = process.env.MONGO_URI;
const backupRoot = process.env.BACKUP_DIR || path.join(__dirname, '..', 'backups');
if (!mongoUri) throw new Error('MONGO_URI is required');
fs.mkdirSync(backupRoot, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const output = path.join(backupRoot, `mongodb-${stamp}`);

const child = spawn('mongodump', ['--uri', mongoUri, '--out', output], { stdio: 'inherit', shell: false });
child.on('error', (err) => { console.error('mongodump was not found. Install MongoDB Database Tools and ensure mongodump is on PATH.'); process.exit(1); });
child.on('close', (code) => { if (code === 0) console.log(`Backup created: ${output}`); else console.error(`Backup failed with exit code ${code}`); process.exit(code || 0); });
