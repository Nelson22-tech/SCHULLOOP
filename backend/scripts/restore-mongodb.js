const { spawn } = require('child_process');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoUri = process.env.MONGO_URI;
const backupPath = process.argv[2];
if (!mongoUri) throw new Error('MONGO_URI is required');
if (!backupPath) throw new Error('Usage: node scripts/restore-mongodb.js <backup-folder>');

console.warn('RESTORE WARNING: this can overwrite existing data. Confirm the backup and target database before continuing.');
const child = spawn('mongorestore', ['--uri', mongoUri, '--drop', backupPath], { stdio: 'inherit', shell: false });
child.on('error', () => { console.error('mongorestore was not found. Install MongoDB Database Tools and ensure mongorestore is on PATH.'); process.exit(1); });
child.on('close', (code) => process.exit(code || 0));
