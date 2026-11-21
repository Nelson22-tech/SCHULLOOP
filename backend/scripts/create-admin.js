// Provisions (or promotes) an administrator account directly in MongoDB.
// Usage: ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=xxxxxxxx npm run create-admin
// For the top-tier role (can promote/demote other admins): add ADMIN_ROLE=super_admin
//   ADMIN_EMAIL=owner@example.com ADMIN_PASSWORD=xxxxxxxx ADMIN_ROLE=super_admin npm run create-admin
// This is deliberately the ONLY way to create a super_admin - there is no in-app button for it,
// even for an existing super_admin, so creating one always requires direct database access.
const crypto = require('crypto');
const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/schulloop';

const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const password = String(process.env.ADMIN_PASSWORD || '');
const fullName = String(process.env.ADMIN_NAME || 'Platform Administrator').trim();
const role = String(process.env.ADMIN_ROLE || 'admin').trim();

if (!email || password.length < 8) {
  console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD (minimum 8 characters) before running create-admin.');
  process.exit(1);
}
if (!['admin', 'super_admin'].includes(role)) {
  console.error('ADMIN_ROLE must be "admin" or "super_admin" if set.');
  process.exit(1);
}

// Mirrors the User schema in index.js. Kept in sync manually since this
// script runs standalone rather than importing the running server.
const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String, default: '' },
  userType: { type: String, enum: ['student', 'parent', 'graduate', 'employer', 'admin', 'super_admin'], default: 'parent' },
  passwordSalt: { type: String, required: true },
  passwordHash: { type: String, required: true },
  bio: { type: String, default: '' },
  skills: [String],
  education: { type: mongoose.Schema.Types.Mixed, default: null },
  profileVisibility: { type: Boolean, default: true },
  blockedUserIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
});
const User = mongoose.model('User', userSchema);

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

async function main() {
  await mongoose.connect(MONGO_URI);
  const passwordData = hashPassword(password);

  const admin = await User.findOneAndUpdate(
    { email },
    {
      $set: {
        fullName,
        email,
        userType: role,
        passwordSalt: passwordData.salt,
        passwordHash: passwordData.hash,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  console.log(`${role === "super_admin" ? "Super admin" : "Admin"} account provisioned: ${admin.email}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Failed to provision admin:', err.message);
  process.exit(1);
});
