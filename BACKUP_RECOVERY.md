# SchulLoop Backup & Recovery

## Implemented foundation
- `backend/scripts/backup-mongodb.js` runs `mongodump` using `MONGO_URI`.
- `backend/scripts/restore-mongodb.js` restores a selected backup using `mongorestore`.
- `BACKUP_DIR` can define the backup destination.
- Do not commit backups or production `.env` files.

## Commands
From `backend/`:
```powershell
npm run backup
node scripts/restore-mongodb.js .\backups\mongodb-<timestamp>
```

MongoDB Database Tools must be installed and `mongodump`/`mongorestore` must be on PATH.

## Production policy
Run backups on a scheduled job (hourly target from the SRS), copy backups to separate protected storage, encrypt them, restrict access, define retention, and test restoration periodically. The local scripts are the recovery foundation; cloud scheduling/storage are deployment responsibilities.
