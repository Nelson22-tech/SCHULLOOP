const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const crypto = require('crypto');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const PDFDocument = require('pdfkit');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  },
});

app.use(cors());
// Basic security headers and a small in-memory rate limiter for sign-in style routes.
app.disable('x-powered-by');
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || 1); // set when hosted behind a proxy so rate limits see real client IPs
app.use((req, res, next) => { res.set({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' }); next(); });
const rateBuckets = new Map();
function rateLimit(name, max, windowMs) {
  return (req, res, next) => {
    const key = `${name}:${req.ip}`; const now = Date.now();
    const hit = rateBuckets.get(key);
    if (!hit || hit.resetAt < now) { rateBuckets.set(key, { count: 1, resetAt: now + windowMs }); return next(); }
    hit.count += 1;
    if (hit.count > max) { res.set('Retry-After', String(Math.ceil((hit.resetAt - now) / 1000))); return res.status(429).json({ message: 'Too many attempts. Please wait a few minutes and try again.' }); }
    next();
  };
}
setInterval(() => { const now = Date.now(); for (const [k, v] of rateBuckets) if (v.resetAt < now) rateBuckets.delete(k); }, 10 * 60 * 1000).unref();
app.use('/api/auth/login', rateLimit('login', 15, 15 * 60 * 1000));
app.use('/api/auth/signup', rateLimit('signup', 10, 60 * 60 * 1000));
app.use('/api/auth/forgot-password', rateLimit('forgot', 5, 15 * 60 * 1000));
app.use('/api/auth/reset-password', rateLimit('reset', 10, 15 * 60 * 1000));
app.use('/api/auth/google', rateLimit('google', 60, 15 * 60 * 1000));
app.use('/api/auth/apple', rateLimit('apple', 30, 15 * 60 * 1000));
app.use('/api/schools/:id/events', rateLimit('schoolevent', 60, 15 * 60 * 1000));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// --- File Upload Setup (FR-UPLOAD-01 to 05) ---
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const RECEIPT_DIR = path.join(__dirname, 'receipts');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(RECEIPT_DIR, { recursive: true });
// Verification documents live outside the public /uploads folder and are only served to authorised users.
const PRIVATE_DIR = path.join(__dirname, 'uploads_private');
fs.mkdirSync(PRIVATE_DIR, { recursive: true });
app.use('/uploads', express.static(UPLOAD_DIR));

const ALLOWED_UPLOAD_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp',
  'application/pdf',
]);
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`);
    },
  }),
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_UPLOAD_TYPES.has(file.mimetype)) {
      return cb(new Error('Unsupported file type'));
    }
    cb(null, true);
  },
});

const uploadPrivate = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, PRIVATE_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${crypto.randomBytes(12).toString('hex')}${ext}`);
    },
  }),
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (req, file, cb) => (ALLOWED_UPLOAD_TYPES.has(file.mimetype) ? cb(null, true) : cb(new Error('Unsupported file type'))),
});

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// --- Mongoose Schemas & Models ---
const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String, default: '' },
  country: { type: String, default: '' },
  studyGoal: { type: String, default: '' },
  userType: { type: String, enum: ['student', 'parent', 'graduate', 'employer', 'school', 'admin', 'super_admin'], default: 'parent' },
  passwordSalt: { type: String, required: true },
  passwordHash: { type: String, required: true },
  bio: { type: String, default: '' },
  skills: [String],
  avatarUrl: { type: String, default: '' },
  // Legacy free-form shape kept for old records; new writes always use the structured array below.
  education: { type: mongoose.Schema.Types.Mixed, default: null },
  // Structured, LinkedIn-style education history. schoolId optionally links to this platform's
  // own School records, which a generic profile field on another network could not do.
  educationHistory: [{
    school: { type: String, required: true },
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', default: null },
    degree: { type: String, default: '' },
    fieldOfStudy: { type: String, default: '' },
    startYear: { type: Number, default: null },
    endYear: { type: Number, default: null },
  }],
  experience: [{
    title: { type: String, required: true },
    company: { type: String, required: true },
    location: { type: String, default: '' },
    startYear: { type: Number, default: null },
    endYear: { type: Number, default: null },
    current: { type: Boolean, default: false },
    description: { type: String, default: '' },
  }],
  profileVisibility: { type: Boolean, default: true },
  blockedUserIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  active: { type: Boolean, default: true },
  notificationPreferences: {
    messages: { type: Boolean, default: true },
    connections: { type: Boolean, default: true },
    jobs: { type: Boolean, default: true },
  },
  twoFactorEnabled: { type: Boolean, default: false },
  expoPushToken: { type: String, default: '' },
  // v3.2: additive capabilities (userType is never changed by them) and the "My Journey" profile.
  capabilities: { type: [String], default: [] },
  journey: {
    stage: { type: String, default: '' },
    education: [{
      institution: { type: String, default: '' }, programme: { type: String, default: '' },
      qualification: { type: String, default: '' }, startYear: { type: Number, default: null },
      endYear: { type: Number, default: null }, graduated: { type: Boolean, default: false },
    }],
    qualifications: [{
      title: { type: String, default: '' }, issuer: { type: String, default: '' }, year: { type: Number, default: null },
    }],
    skills: { type: [String], default: [] },
    experience: [{
      title: { type: String, default: '' }, company: { type: String, default: '' },
      startYear: { type: Number, default: null }, endYear: { type: Number, default: null },
      description: { type: String, default: '' },
    }],
    careerGoals: { type: String, default: '' },
    visibility: {
      education: { type: String, default: 'public' }, experience: { type: String, default: 'public' },
      skills: { type: String, default: 'public' }, contact: { type: String, default: 'private' },
    },
  },
}, { timestamps: true });
const User =mongoose.model('User', userSchema);

// A connection endorsing one of the user's listed skills - LinkedIn's "skill endorsement".
const endorsementSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  endorserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  skill: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});
endorsementSchema.index({ userId: 1, endorserId: 1, skill: 1 }, { unique: true });
const Endorsement = mongoose.model('Endorsement', endorsementSchema);

// A short written recommendation from one connection to another - LinkedIn's "recommendations".
const recommendationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});
recommendationSchema.index({ userId: 1, fromUserId: 1 }, { unique: true });
const Recommendation = mongoose.model('Recommendation', recommendationSchema);

// A short status update visible to the author's connections - the basis of the network feed.
const postSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, default: '' },
  mediaUrls: { type: [String], default: [] },
  mediaTypes: { type: [String], default: [] },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [{ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, text: String, createdAt: { type: Date, default: Date.now } }],
  visibility: { type: String, enum: ['connections', 'public'], default: 'connections' },
  createdAt: { type: Date, default: Date.now },
});
postSchema.index({ userId: 1, createdAt: -1 });
const Post = mongoose.model('Post', postSchema);

// A community run by a school's own verified representative - a class cohort, a club, a study
// group, an announcements channel, or an alumni group for that specific school. Distinct from the
// general Connect network: membership and visibility are scoped to one school's group, not to
// the user's platform-wide connections.
const groupSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  type: { type: String, enum: ['class', 'club', 'study', 'announcements', 'alumni'], default: 'club' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  memberIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });
groupSchema.index({ schoolId: 1 });
const Group = mongoose.model('Group', groupSchema);

// A post inside one school group - visible only to that group's members, separate from the
// general network feed (Post, above), which is visible to a user's personal connections.
const groupPostSchema = new mongoose.Schema({
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});
groupPostSchema.index({ groupId: 1, createdAt: -1 });
const GroupPost = mongoose.model('GroupPost', groupPostSchema);

const schoolSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: { type: String, default: '' },
  latitude: { type: Number, default: null },
  longitude: { type: Number, default: null },
  // GeoJSON point ([lng, lat]) kept in sync from latitude/longitude; powers the 2dsphere nearby search.
  geo: { type: { type: String, enum: ['Point'] }, coordinates: { type: [Number], default: undefined } },
  type: { type: String, default: 'Other' },
  rating: { type: Number, default: 0 },
  fees: { type: Number, default: null },
  // `verified` is kept for backward compatibility and is derived from verificationStatus.
  verified: { type: Boolean, default: false },
  // imported = from the global dataset, schulloop = created/approved on the platform.
  source: { type: String, enum: ['imported', 'schulloop'], default: 'schulloop' },
  verificationStatus: { type: String, enum: ['unverified', 'claimed', 'verified'], default: 'unverified' },
  claimedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  externalId: { type: String, default: '' },
  dataSource: { type: String, default: '' },
  founded: { type: Number },
  studentCount: { type: Number, default: 0 },
  staffCount: { type: Number, default: 0 },
  description: { type: String, default: '' },
  facilities: [String],
  imageUrl: { type: String, default: '' },
  logoUrl: { type: String, default: '' },
  country: { type: String, default: '' },
  region: { type: String, default: '' },
  city: { type: String, default: '' },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  website: { type: String, default: '' },
  programs: [String],
  admissionRequirements: [String],
  contactPerson: { type: String, default: '' },
  virtualTourUrl: { type: String, default: '' },
  currency: { type: String, default: 'USD' },
  // --- School portal (school administrator workspace) ---
  ownership: { type: String, default: '' },
  motto: { type: String, default: '' },
  neighbourhood: { type: String, default: '' },
  address: { type: String, default: '' },
  whatsapp: { type: String, default: '' },
  admissionsContactName: { type: String, default: '' },
  admissionsContactRole: { type: String, default: '' },
  levels: [String],
  language: { type: String, default: '' },
  schoolMode: { type: String, default: '' },
  programList: [{ name: { type: String, required: true }, level: { type: String, default: '' }, status: { type: String, default: 'published' } }],
  admissionStatus: { type: String, default: '' },
  academicYear: { type: String, default: '' },
  admissionOpens: { type: String, default: '' },
  admissionCloses: { type: String, default: '' },
  requirementsText: { type: String, default: '' },
  requiredDocuments: { type: String, default: '' },
  applicationMethod: { type: String, default: '' },
  applicationFee: { type: String, default: '' },
  coverUrl: { type: String, default: '' },
  gallery: [{ url: { type: String, required: true }, caption: { type: String, default: '' }, createdAt: { type: Date, default: Date.now } }],
  profileStatus: { type: String, enum: ['draft', 'submitted'], default: 'draft' },
  // Private: never serialised publicly (see serializeSchool).
  verificationDocs: [{ kind: { type: String, default: '' }, name: { type: String, default: '' }, url: { type: String, default: '' }, createdAt: { type: Date, default: Date.now } }],
  verificationSubmittedAt: { type: Date, default: null },
}, { timestamps: true });

schoolSchema.pre('validate', function syncSchoolDerivedFields(next) {
  // Records created before this change only have `verified`.
  if (this.isNew && this.verified && this.verificationStatus === 'unverified') this.verificationStatus = 'verified';
  this.verified = this.verificationStatus === 'verified';
  const lat = Number(this.latitude);
  const lng = Number(this.longitude);
  if (this.latitude != null && this.longitude != null && Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)) {
    this.geo = { type: 'Point', coordinates: [lng, lat] };
  } else {
    this.geo = undefined;
  }
  next();
});
schoolSchema.index({ geo: '2dsphere' });
schoolSchema.index({ country: 1, region: 1, city: 1 });
schoolSchema.index({ name: 1 });
schoolSchema.index({ source: 1, externalId: 1 });
const School = mongoose.model('School', schoolSchema);

// A school representative asks to take ownership of an (usually imported) listing.
const schoolClaimSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  contactName: { type: String, default: '' },
  contactEmail: { type: String, default: '' },
  contactPhone: { type: String, default: '' },
  evidence: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  reviewNote: { type: String, default: '' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdAt: { type: Date, default: Date.now },
});
schoolClaimSchema.index({ schoolId: 1, userId: 1, status: 1 });
const SchoolClaim = mongoose.model('SchoolClaim', schoolClaimSchema);

const jobSchema = new mongoose.Schema({
  title: { type: String, required: true },
  company: { type: String, required: true },
  location: { type: String, required: true },
  salary: { type: String, default: '' },
  jobType: { type: String, default: 'Full-time' },
  skills: [String],
  description: { type: String, default: '' },
  companyLogo: { type: String, default: '' },
  employerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});
const Job = mongoose.model('Job', jobSchema);

const applicationSchema = new mongoose.Schema({
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  jobTitle: String,
  company: String,
  status: { type: String, default: 'pending' },
  coverLetter: { type: String, default: '' },
  resumeUrl: { type: String, default: '' },
  appliedAt: { type: Date, default: Date.now },
});
const Application = mongoose.model('Application', applicationSchema);

// School admission applications are distinct from job applications. A confirmation
// receipt is issued when an application is successfully recorded; payment receipts
// are issued separately and only after a fee payment is verified.
const admissionApplicationSchema = new mongoose.Schema({
  applicationNumber: { type: String, required: true, unique: true, index: true },
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  program: { type: String, required: true, trim: true, maxlength: 160 },
  academicYear: { type: String, required: true, trim: true, maxlength: 40 },
  personalStatement: { type: String, default: '', maxlength: 3000 },
  status: { type: String, enum: ['submitted', 'under_review', 'accepted', 'rejected', 'withdrawn'], default: 'submitted' },
  submittedAt: { type: Date, default: Date.now },
}, { timestamps: true });
admissionApplicationSchema.index({ schoolId: 1, userId: 1, academicYear: 1, program: 1 }, { unique: true });
const AdmissionApplication = mongoose.model('AdmissionApplication', admissionApplicationSchema);

const reviewSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  author: String,
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true },
  status: { type: String, default: 'approved' },
  createdAt: { type: Date, default: Date.now },
});
const Review = mongoose.model('Review', reviewSchema);

const favoriteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
});
favoriteSchema.index({ userId: 1, schoolId: 1 }, { unique: true });
const Favorite = mongoose.model('Favorite', favoriteSchema);

const conversationSchema = new mongoose.Schema({
  userIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', default: null },
  conversationType: { type: String, enum: ['direct', 'school', 'employer'], default: 'direct' },
  updatedAt: { type: Date, default: Date.now },
});
const Conversation = mongoose.model('Conversation', conversationSchema);

const messageSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderName: String,
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});
const Message = mongoose.model('Message', messageSchema);

const connectionSchema = new mongoose.Schema({
  fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  toUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
});
const Connection = mongoose.model('Connection', connectionSchema);

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: String,
  message: String,
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});
const Notification = mongoose.model('Notification', notificationSchema);

const paymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  amount: { type: Number, required: true },
  method: { type: String, default: 'card' },
  status: { type: String, default: 'pending' },
  reference: String,
  // Platform revenue: PLATFORM_FEE_PERCENT of the amount (default 3%), recorded when the payment is created.
  platformFee: { type: Number, default: 0 },
  schoolNet: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});
const Payment = mongoose.model('Payment', paymentSchema);

// Subscription renewals are manual: each purchase is a separate provider-verified transaction.
const subscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  planKey: { type: String, required: true },
  planName: { type: String, required: true },
  amount: { type: Number, required: true, min: 0.01 },
  currency: { type: String, default: 'USD', uppercase: true },
  reference: { type: String, required: true, unique: true, index: true },
  status: { type: String, enum: ['pending', 'active', 'failed', 'expired'], default: 'pending', index: true },
  startsAt: { type: Date, default: null },
  endsAt: { type: Date, default: null },
  transactionId: { type: String, default: '' },
}, { timestamps: true });
subscriptionSchema.index({ userId: 1, status: 1, endsAt: -1 });
const Subscription = mongoose.model('Subscription', subscriptionSchema);

const receiptSchema = new mongoose.Schema({
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', required: true, unique: true },
  receiptNumber: { type: String, required: true, unique: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  paymentMethod: { type: String, default: 'card' },
  transactionReference: { type: String, required: true },
  issuedAt: { type: Date, default: Date.now },
  pdfPath: { type: String, required: true },
}, { timestamps: true });
const Receipt = mongoose.model('Receipt', receiptSchema);

const rejectionSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  reason: { type: String, required: true },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
});
const Rejection = mongoose.model('Rejection', rejectionSchema);

const reportSchema = new mongoose.Schema({
  reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  targetType: { type: String, enum: ['profile', 'message', 'school_review'], required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, default: null },
  reason: { type: String, required: true },
  status: { type: String, enum: ['open', 'reviewed', 'dismissed'], default: 'open' },
  createdAt: { type: Date, default: Date.now },
});
const Report = mongoose.model('Report', reportSchema);

const searchLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  query: { type: String, default: '' },
  filters: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now },
});
const SearchLog = mongoose.model('SearchLog', searchLogSchema);

const documentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  category: { type: String, enum: ['certificate','resume','transcript','portfolio','other'], default: 'other' },
  url: { type: String, required: true },
  mimeType: { type: String, default: '' },
  sizeBytes: { type: Number, default: 0 },
  visibility: { type: String, enum: ['private','employers','public'], default: 'employers' },
  createdAt: { type: Date, default: Date.now },
});
const CareerDocument = mongoose.model('CareerDocument', documentSchema);

const interviewSchema = new mongoose.Schema({
  applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true },
  employerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  scheduledAt: { type: Date, required: true }, durationMinutes: { type: Number, default: 30 },
  mode: { type: String, enum: ['video','phone','in_person'], default: 'video' }, meetingUrl: { type: String, default: '' }, notes: { type: String, default: '' },
  status: { type: String, enum: ['scheduled','completed','cancelled'], default: 'scheduled' }, createdAt: { type: Date, default: Date.now },
});
const Interview = mongoose.model('Interview', interviewSchema);
const pushTokenSchema = new mongoose.Schema({ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true }, token: { type: String, required: true }, platform: { type: String, default: '' }, updatedAt: { type: Date, default: Date.now } });
const PushToken = mongoose.model('PushToken', pushTokenSchema);

// --- v3.2 models: freelance projects, local services, scholarships, saved items ---
const objectRef = (ref, extra = {}) => ({ type: mongoose.Schema.Types.ObjectId, ref, ...extra });

const projectSchema = new mongoose.Schema({
  ownerId: objectRef('User', { required: true, index: true }),
  title: { type: String, required: true, trim: true, maxlength: 140 },
  description: { type: String, default: '', maxlength: 5000 },
  category: { type: String, enum: ['Design', 'Development', 'Writing', 'Marketing', 'Video', 'Other'], default: 'Other' },
  skills: [String],
  budgetMin: { type: Number, default: 0 },
  budgetMax: { type: Number, default: 0 },
  budgetType: { type: String, enum: ['fixed', 'hourly'], default: 'fixed' },
  duration: { type: String, default: '', maxlength: 80 },
  status: { type: String, enum: ['draft', 'open', 'in_progress', 'completed', 'cancelled'], default: 'open', index: true },
}, { timestamps: true });
const Project = mongoose.model('Project', projectSchema);

const proposalSchema = new mongoose.Schema({
  projectId: objectRef('Project', { required: true, index: true }),
  freelancerId: objectRef('User', { required: true, index: true }),
  message: { type: String, default: '', maxlength: 3000 },
  price: { type: Number, default: 0 },
  deliveryDays: { type: Number, default: 0 },
  status: { type: String, enum: ['submitted', 'selected', 'rejected'], default: 'submitted' },
}, { timestamps: true });
proposalSchema.index({ projectId: 1, freelancerId: 1 }, { unique: true });
const Proposal = mongoose.model('Proposal', proposalSchema);

const freelancerProfileSchema = new mongoose.Schema({
  userId: objectRef('User', { required: true, unique: true }),
  title: { type: String, default: '', maxlength: 120 },
  skills: [String],
  rate: { type: String, default: '', maxlength: 60 },
  availability: { type: String, enum: ['available', 'busy'], default: 'available' },
  bio: { type: String, default: '', maxlength: 2000 },
  location: { type: String, default: '', maxlength: 120 },
  portfolio: [{ title: { type: String, default: '' }, url: { type: String, default: '' } }],
}, { timestamps: true });
const FreelancerProfile = mongoose.model('FreelancerProfile', freelancerProfileSchema);

const SERVICE_CATEGORIES = ['Plumbing', 'Electrical', 'Cleaning', 'Car Repair', 'Beauty & Salon', 'Handyman', 'Photography', 'Other'];
const serviceListingSchema = new mongoose.Schema({
  providerId: objectRef('User', { required: true, index: true }),
  title: { type: String, required: true, trim: true, maxlength: 140 },
  category: { type: String, enum: SERVICE_CATEGORIES, default: 'Other' },
  description: { type: String, default: '', maxlength: 3000 },
  area: { type: String, default: '', maxlength: 120 },
  city: { type: String, default: '', maxlength: 80 },
  pricing: { type: String, default: '', maxlength: 120 },
  availability: { type: String, default: '', maxlength: 120 },
  contactMethod: { type: String, default: '', maxlength: 120 },
  status: { type: String, enum: ['active', 'closed'], default: 'active', index: true },
}, { timestamps: true });
const ServiceListing = mongoose.model('ServiceListing', serviceListingSchema);

const SERVICE_REQUEST_STATUSES = ['requested', 'quotation_sent', 'accepted', 'in_progress', 'completed', 'cancelled', 'reported'];
const serviceRequestSchema = new mongoose.Schema({
  serviceId: objectRef('ServiceListing', { required: true, index: true }),
  serviceTitle: { type: String, default: '' },
  providerId: objectRef('User', { required: true, index: true }),
  customerId: objectRef('User', { required: true, index: true }),
  message: { type: String, default: '', maxlength: 2000 },
  preferredDate: { type: String, default: '', maxlength: 60 },
  contactInfo: { type: String, default: '', maxlength: 200 },
  status: { type: String, enum: SERVICE_REQUEST_STATUSES, default: 'requested' },
  quote: { type: { amount: Number, note: String }, default: null, _id: false },
}, { timestamps: true });
const ServiceRequest = mongoose.model('ServiceRequest', serviceRequestSchema);

const scholarshipSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  provider: { type: String, default: '', maxlength: 160 },
  type: { type: String, enum: ['scholarship', 'training', 'webinar', 'immigration'], default: 'scholarship', index: true },
  level: { type: String, enum: ['Undergraduate', 'Postgraduate', 'Other'], default: 'Other' },
  location: { type: String, default: '', maxlength: 160 },
  mode: { type: String, enum: ['online', 'in_person', 'hybrid'], default: 'online' },
  deadline: { type: Date, default: null },
  description: { type: String, default: '', maxlength: 4000 },
  eligibility: { type: String, default: '', maxlength: 2000 },
  applyUrl: { type: String, default: '', maxlength: 500 },
  source: { type: String, default: '', maxlength: 160 },
  verified: { type: Boolean, default: false },
}, { timestamps: true });
const Scholarship = mongoose.model('Scholarship', scholarshipSchema);

const SAVED_TYPES = ['scholarship', 'project', 'service', 'job', 'school'];
const savedItemSchema = new mongoose.Schema({
  userId: objectRef('User', { required: true, index: true }),
  itemType: { type: String, enum: SAVED_TYPES, required: true },
  itemId: { type: String, required: true, maxlength: 64 },
}, { timestamps: true });
savedItemSchema.index({ userId: 1, itemType: 1, itemId: 1 }, { unique: true });
const SavedItem = mongoose.model('SavedItem', savedItemSchema);

// --- Authentication & Token Management ---
const passwordResetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  codeHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true, index: { expires: 0 } }, // MongoDB removes expired codes automatically
}, { timestamps: true });
const PasswordReset = mongoose.model('PasswordReset', passwordResetSchema);

// Sends a transactional email through Brevo or Resend (plain HTTPS, no extra packages).
// Returns true when sent, false when no provider is configured.
async function sendEmail({ to, subject, text }) {
  const from = process.env.MAIL_FROM; const fromName = process.env.MAIL_FROM_NAME || 'SchulLoop';
  if (process.env.BREVO_API_KEY && from) {
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST', headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ sender: { name: fromName, email: from }, to: [{ email: to }], subject, textContent: text }),
    });
    if (!r.ok) throw new Error(`Brevo rejected the email (${r.status}): ${(await r.text()).slice(0, 200)}`);
    return true;
  }
  if (process.env.RESEND_API_KEY && from) {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: `${fromName} <${from}>`, to: [to], subject, text }),
    });
    if (!r.ok) throw new Error(`Resend rejected the email (${r.status}): ${(await r.text()).slice(0, 200)}`);
    return true;
  }
  return false;
}
const hashResetCode = (code) => crypto.createHmac('sha256', JWT_SECRET).update(String(code)).digest('hex');

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function passwordsMatch(password, user) {
  if (!password || !user?.passwordSalt || !user?.passwordHash) return false;
  const candidate = crypto.scryptSync(password, user.passwordSalt, 64);
  const stored = Buffer.from(user.passwordHash, 'hex');
  return candidate.length === stored.length && crypto.timingSafeEqual(candidate, stored);
}

function publicUser(user) {
  return {
    id: user._id, fullName: user.fullName, email: user.email, phone: user.phone || '',
    country: user.country || '', studyGoal: user.studyGoal || '',
    userType: user.userType, bio: user.bio || '', skills: user.skills || [],
    avatarUrl: user.avatarUrl || '',
    education: user.education || null, educationHistory: user.educationHistory || [],
    experience: user.experience || [],
    profileVisibility: user.profileVisibility !== false,
    active: user.active !== false, notificationPreferences: user.notificationPreferences || {},
    twoFactorEnabled: Boolean(user.twoFactorEnabled),
  };
}

// Accepted connections only - the LinkedIn-style "1st-degree network" a user actually has.
async function acceptedConnectionIds(userId) {
  const connections = await Connection.find({
    status: 'accepted',
    $or: [{ fromUserId: userId }, { toUserId: userId }],
  });
  return connections.map((c) => (c.fromUserId.toString() === userId.toString() ? c.toUserId : c.fromUserId));
}

// The relationship between two specific users, used on a profile page to decide which button to
// show (Connect / Pending / Message) - mirrors how LinkedIn's profile header behaves.
async function connectionStatusBetween(userId, otherUserId) {
  if (userId.toString() === otherUserId.toString()) return 'self';
  const connection = await Connection.findOne({
    $or: [
      { fromUserId: userId, toUserId: otherUserId },
      { fromUserId: otherUserId, toUserId: userId },
    ],
  });
  if (!connection) return 'none';
  if (connection.status === 'accepted') return 'connected';
  if (connection.status === 'pending') {
    return connection.fromUserId.toString() === userId.toString() ? 'pending_sent' : 'pending_received';
  }
  return 'none';
}

function createToken(user) {
  if (!JWT_SECRET) throw new Error('JWT_SECRET is missing in backend environment');
  return jwt.sign({ sub: user._id.toString(), role: user.userType }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

async function authenticatedUser(request) {
  const header = request.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token || !JWT_SECRET) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (!user || user.active === false) return null;
    return user;
  } catch { return null; }
}

async function requireAuth(request, response) {
  const user = await authenticatedUser(request);
  if (!user) { response.status(401).json({ message: 'Authentication required' }); return null; }
  return user;
}

// Two admin tiers: 'admin' runs day-to-day moderation (verify schools, review claims, view
// analytics); 'super_admin' can additionally promote/demote other users' roles (FR, Section
// 3.6). isAdminRole() treats both as "an admin" for every existing admin-only route below, so a
// super_admin automatically has every regular admin capability too.
function isAdminRole(userType) {
  return userType === 'admin' || userType === 'super_admin';
}

async function requireAdmin(request, response) {
  const user = await requireAuth(request, response);
  if (!user) return null;
  if (!isAdminRole(user.userType)) { response.status(403).json({ message: 'Administrator access required' }); return null; }
  return user;
}

async function requireSuperAdmin(request, response) {
  const user = await requireAuth(request, response);
  if (!user) return null;
  if (user.userType !== 'super_admin') { response.status(403).json({ message: 'Super admin access required' }); return null; }
  return user;
}

// --- Helper Functions ---
function queryValue(query, key) {
  return typeof query.get === 'function' ? query.get(key) : query[key];
}

// Fields anyone can see for ANY school (verified or not). Everything else is verified-only.
const PUBLIC_SCHOOL_FIELDS = ['_id', 'name', 'country', 'region', 'city', 'location', 'type', 'latitude', 'longitude',
  'source', 'verificationStatus', 'verified'];

function basicSchool(school) {
  const doc = typeof school.toObject === 'function' ? school.toObject() : school;
  const out = {};
  for (const key of PUBLIC_SCHOOL_FIELDS) if (doc[key] !== undefined) out[key] = doc[key];
  if (!out.location) out.location = [doc.city, doc.region, doc.country].filter(Boolean).join(', ');
  out.locked = true;
  if (doc.distance !== undefined) out.distance = doc.distance;
  return out;
}

// Verified schools expose their full profile; everything else is reduced to the basics on the server.
function serializeSchool(school) {
  const doc = typeof school.toObject === 'function' ? school.toObject() : { ...school };
  if (doc.verificationStatus === 'verified' || doc.verified === true) {
    delete doc.geo; delete doc.claimedBy; delete doc.externalId; delete doc.dataSource; delete doc.verificationDocs; delete doc.verificationSubmittedAt;
    doc.locked = false;
    return doc;
  }
  return basicSchool(doc);
}

async function notifyUser(userId, type, message) {
  try {
    const user = await User.findById(userId).select('notificationPreferences active');
    if (!user || user.active === false) return;
    const prefs = user.notificationPreferences || {};
    const prefKey = { message: 'messages', connection_request: 'connections', connection_accepted: 'connections' }[type];
    if (prefKey && prefs[prefKey] === false) return;
    await Notification.create({ userId, type, message });
    const tokenDoc = await PushToken.findOne({ userId }).lean();
    if (tokenDoc?.token && /^ExponentPushToken\[.+\]$/.test(tokenDoc.token)) {
      fetch('https://exp.host/--/api/v2/push/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: tokenDoc.token, sound: 'default', title: 'SchulLoop', body: message, data: { type } }) }).catch(() => {});
    }
  } catch (error) { console.error('Notification error:', error.message); }
}

function escapeRegex(value) { return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
const norm = (value) => String(value || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

function distanceInKilometres(latitudeA, longitudeA, latitudeB, longitudeB) {
  const earthRadius = 6371;
  const latitudeDelta = (latitudeB - latitudeA) * Math.PI / 180;
  const longitudeDelta = (longitudeB - longitudeA) * Math.PI / 180;
  const value = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(latitudeA * Math.PI / 180)
      * Math.cos(latitudeB * Math.PI / 180)
      * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

// --- API Routes ---
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

// Which optional features are configured (booleans only, never secrets).
function featureStatus() {
  const has = (k) => Boolean(String(process.env[k] || '').trim());
  return {
    passwordResetEmail: (has('BREVO_API_KEY') || has('RESEND_API_KEY')) && has('MAIL_FROM'),
    googleSignIn: has('GOOGLE_CLIENT_ID') && has('GOOGLE_CLIENT_SECRET'),
    appleSignIn: has('APPLE_CLIENT_ID'),
    payments: has('FLUTTERWAVE_SECRET_KEY'),
    paymentWebhook: has('FLUTTERWAVE_WEBHOOK_SECRET'),
    publicApiUrl: has('PUBLIC_API_URL'),
  };
}
function logFeatureStatus() {
  const f = featureStatus();
  const line = (ok, name, fix) => console.log(`  ${ok ? '[ok]     ' : '[missing]'} ${name}${ok ? '' : ` -> ${fix}`}`);
  console.log('Feature check:');
  line(f.passwordResetEmail, 'Password-reset emails', 'set BREVO_API_KEY (or RESEND_API_KEY) and MAIL_FROM');
  line(f.googleSignIn, 'Google sign-in', 'set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, and PUBLIC_API_URL (https)');
  line(f.appleSignIn, 'Apple sign-in', 'set APPLE_CLIENT_ID');
  line(f.payments, 'Payments (Flutterwave)', 'set FLUTTERWAVE_SECRET_KEY');
  line(f.paymentWebhook, 'Payment webhook', 'set FLUTTERWAVE_WEBHOOK_SECRET');
}

app.get('/api/config-check', (req, res) => {
  res.status(200).json({
    status: 'ok',
    api: true,
    features: featureStatus(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    environment: process.env.NODE_ENV || 'development',
  });
});

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { fullName, email: rawEmail, password, phone, userType } = req.body;
    const email = String(rawEmail || '').trim().toLowerCase();
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: 'Full name, email, and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }
    const passwordData = hashPassword(password);
    const allowedUserTypes = ['student', 'parent', 'graduate', 'employer', 'school'];
    const user = new User({
      fullName: String(fullName).trim(),
      email,
      phone: String(phone || '').trim(),
      userType: allowedUserTypes.includes(userType) ? userType : 'parent',
      passwordSalt: passwordData.salt,
      passwordHash: passwordData.hash,
    });
    await user.save();
    res.status(201).json({ token: createToken(user), user: publicUser(user) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email: rawEmail, password } = req.body;
    const email = String(rawEmail || '').trim().toLowerCase();
    const user = await User.findOne({ email });
    if (!user || !passwordsMatch(password, user)) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    res.status(200).json({ token: createToken(user), user: publicUser(user) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --- Social sign-in (Google / Apple) ---
// The app obtains an ID token from the provider; the backend verifies it and signs the user in
// (creating an account on first use). Set GOOGLE_CLIENT_ID / APPLE_CLIENT_ID in backend/.env.
async function verifyGoogleIdToken(idToken) {
  const clientIds = String(process.env.GOOGLE_CLIENT_ID || '').split(',').map((v) => v.trim()).filter(Boolean);
  if (!clientIds.length) throw Object.assign(new Error('Google sign-in is not configured. Add GOOGLE_CLIENT_ID to backend .env'), { status: 503 });
  const r = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  const claims = await r.json().catch(() => ({}));
  if (!r.ok || !clientIds.includes(claims.aud)) throw Object.assign(new Error('Invalid Google sign-in token'), { status: 401 });
  if (!['accounts.google.com', 'https://accounts.google.com'].includes(claims.iss)) throw Object.assign(new Error('Invalid Google sign-in token'), { status: 401 });
  if (String(claims.email_verified) !== 'true' || !claims.email) throw Object.assign(new Error('Your Google email is not verified'), { status: 401 });
  return { email: claims.email, name: claims.name || '', picture: claims.picture || '' };
}

let appleKeysCache = { keys: null, at: 0 };
async function verifyAppleIdToken(idToken) {
  const clientIds = String(process.env.APPLE_CLIENT_ID || '').split(',').map((v) => v.trim()).filter(Boolean);
  if (!clientIds.length) throw Object.assign(new Error('Apple sign-in is not configured. Add APPLE_CLIENT_ID to backend .env'), { status: 503 });
  const decoded = jwt.decode(idToken, { complete: true });
  if (!decoded) throw Object.assign(new Error('Invalid Apple sign-in token'), { status: 401 });
  if (!appleKeysCache.keys || Date.now() - appleKeysCache.at > 3600 * 1000) {
    const r = await fetch('https://appleid.apple.com/auth/keys');
    appleKeysCache = { keys: (await r.json()).keys || [], at: Date.now() };
  }
  const jwk = appleKeysCache.keys.find((k) => k.kid === decoded.header.kid);
  if (!jwk) throw Object.assign(new Error('Invalid Apple sign-in token'), { status: 401 });
  try {
    const claims = jwt.verify(idToken, crypto.createPublicKey({ key: jwk, format: 'jwk' }), { algorithms: ['RS256'], issuer: 'https://appleid.apple.com', audience: clientIds });
    if (!claims.email) throw new Error('missing email');
    if (claims.email_verified !== undefined && String(claims.email_verified) !== 'true') throw new Error('email not verified');
    return { email: claims.email, name: '', picture: '' };
  } catch (e) {
    throw Object.assign(new Error('Invalid Apple sign-in token'), { status: 401 });
  }
}

async function socialSignIn(profile, extra = {}) {
  const email = String(profile.email).trim().toLowerCase();
  let user = await User.findOne({ email });
  if (user && user.active === false) throw Object.assign(new Error('This account has been deactivated'), { status: 403 });
  if (!user) {
    const pw = hashPassword(crypto.randomBytes(32).toString('hex'));
    const allowed = ['student', 'parent', 'graduate', 'employer', 'school'];
    user = await User.create({
      fullName: String(extra.fullName || profile.name || email.split('@')[0]).trim(),
      email,
      avatarUrl: profile.picture || '',
      userType: allowed.includes(extra.userType) ? extra.userType : 'parent',
      passwordSalt: pw.salt,
      passwordHash: pw.hash,
    });
  }
  return { token: createToken(user), user: publicUser(user) };
}

app.post('/api/auth/google', async (req, res) => {
  try {
    const profile = await verifyGoogleIdToken(String(req.body.idToken || ''));
    res.json(await socialSignIn(profile, req.body));
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
});

// --- Google sign-in, server-side (works in Expo Go, dev builds and web) ---
// Google only accepts https (or localhost) redirect URIs, which the phone's exp:// / schulloop:// links are not.
// So the browser goes to /google/start -> Google -> /google/callback on this server, which then hands the
// app a short-lived one-time ticket that the app swaps for a normal session at /social/exchange.
const APP_RETURN_PREFIXES = () => String(process.env.APP_RETURN_URL_PREFIXES || 'schulloop://,exp://,http://localhost,https://localhost').split(',').map((v) => v.trim()).filter(Boolean);
const returnUrlAllowed = (u) => Boolean(u) && APP_RETURN_PREFIXES().some((prefix) => String(u).startsWith(prefix));
const publicApiUrl = (req) => String(process.env.PUBLIC_API_URL || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '').replace(/\/api$/, '');
const googleRedirectUri = (req) => `${publicApiUrl(req)}/api/auth/google/callback`;
const usedTickets = new Map();
function bounceToApp(res, returnUrl, params) {
  return res.redirect(302, `${returnUrl}#${new URLSearchParams(params).toString()}`);
}

app.get('/api/auth/google/start', (req, res) => {
  const returnUrl = String(req.query.returnUrl || '');
  if (!returnUrlAllowed(returnUrl)) return res.status(400).send('Invalid return URL');
  const clientId = String(process.env.GOOGLE_CLIENT_ID || '').split(',')[0].trim();
  if (!clientId || !process.env.GOOGLE_CLIENT_SECRET) return bounceToApp(res, returnUrl, { error: 'Google sign-in is not configured on the server (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET).' });
  const state = jwt.sign({ returnUrl, userType: String(req.query.userType || ''), purpose: 'google-state' }, JWT_SECRET, { expiresIn: '10m' });
  const params = new URLSearchParams({ client_id: clientId, redirect_uri: googleRedirectUri(req), response_type: 'code', scope: 'openid email profile', state, prompt: 'select_account' });
  res.redirect(302, `https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

app.get('/api/auth/google/callback', async (req, res) => {
  let st;
  try { st = jwt.verify(String(req.query.state || ''), JWT_SECRET); if (st.purpose !== 'google-state' || !returnUrlAllowed(st.returnUrl)) throw new Error('bad state'); }
  catch { return res.status(400).send('This sign-in link has expired. Close this page and try again from the app.'); }
  try {
    if (req.query.error || !req.query.code) return bounceToApp(res, st.returnUrl, { error: req.query.error === 'access_denied' ? 'cancelled' : 'Google sign-in was not completed.' });
    const clientId = String(process.env.GOOGLE_CLIENT_ID || '').split(',')[0].trim();
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code: String(req.query.code), client_id: clientId, client_secret: process.env.GOOGLE_CLIENT_SECRET || '', redirect_uri: googleRedirectUri(req), grant_type: 'authorization_code' }),
    });
    const tokens = await r.json().catch(() => ({}));
    if (!r.ok || !tokens.id_token) { console.error('Google token exchange failed:', tokens.error, tokens.error_description); return bounceToApp(res, st.returnUrl, { error: 'Google could not confirm your sign-in. Please try again.' }); }
    const profile = await verifyGoogleIdToken(tokens.id_token);
    const session = await socialSignIn(profile, { userType: st.userType });
    const ticket = jwt.sign({ sub: String(session.user.id), purpose: 'social-ticket', jti: crypto.randomUUID() }, JWT_SECRET, { expiresIn: '2m' });
    bounceToApp(res, st.returnUrl, { ticket });
  } catch (error) {
    console.error('Google callback error:', error.message);
    bounceToApp(res, st.returnUrl, { error: error.status ? error.message : 'Google sign-in failed. Please try again.' });
  }
});

app.post('/api/auth/social/exchange', async (req, res) => {
  try {
    const payload = jwt.verify(String(req.body?.ticket || ''), JWT_SECRET);
    if (payload.purpose !== 'social-ticket' || usedTickets.has(payload.jti)) return res.status(401).json({ message: 'This sign-in expired. Please try again.' });
    usedTickets.set(payload.jti, Date.now());
    for (const [k, t] of usedTickets) if (Date.now() - t > 5 * 60 * 1000) usedTickets.delete(k);
    const user = await User.findById(payload.sub);
    if (!user || user.active === false) return res.status(401).json({ message: 'Account unavailable' });
    res.json({ token: createToken(user), user: publicUser(user) });
  } catch { res.status(401).json({ message: 'This sign-in expired. Please try again.' }); }
});

app.post('/api/auth/apple', async (req, res) => {
  try {
    const profile = await verifyAppleIdToken(String(req.body.idToken || ''));
    res.json(await socialSignIn(profile, req.body));
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
});

// Apple posts its result (form_post) here; we bounce it back to the app's return URL.
app.post('/api/auth/apple/callback', (req, res) => {
  const state = String(req.body.state || '');
  let returnUrl = '';
  try { returnUrl = Buffer.from(state.split('.')[0], 'base64url').toString('utf8'); } catch { /* ignore */ }
  const allowed = String(process.env.APP_RETURN_URL_PREFIXES || 'schulloop://,exp://,http://localhost,https://localhost').split(',').map((v) => v.trim());
  if (!returnUrl || !allowed.some((prefix) => returnUrl.startsWith(prefix))) return res.status(400).send('Invalid return URL');
  const params = new URLSearchParams({ id_token: String(req.body.id_token || ''), state, error: String(req.body.error || '') });
  res.redirect(302, `${returnUrl}#${params.toString()}`);
});

app.post('/api/auth/logout', async (req, res) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  // JWTs are stateless; the client removes its token.
  res.status(200).json({ message: 'Logged out' });
});

app.post('/api/auth/forgot-password', async (req, res) => {
  // Always answer the same way, so the endpoint can't be used to find out which emails are registered.
  const reply = () => res.status(200).json({ message: 'If that email is registered, we sent a 6-digit code. It expires in 30 minutes.' });
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email || email.length > 254) return reply();
    const user = await User.findOne({ email });
    if (!user || user.active === false) return reply();
    const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    await PasswordReset.deleteMany({ userId: user._id });
    await PasswordReset.create({ userId: user._id, codeHash: hashResetCode(code), expiresAt: new Date(Date.now() + 30 * 60 * 1000) });
    const text = `Hello ${user.fullName || ''},\n\nYour SchulLoop password reset code is: ${code}\n\nIt expires in 30 minutes. If you did not ask for this, you can ignore this email.`;
    try {
      const sent = await sendEmail({ to: user.email, subject: 'Your SchulLoop password reset code', text });
      if (!sent) {
        if (process.env.NODE_ENV === 'production') console.error('Password reset requested but no email provider is configured (set BREVO_API_KEY or RESEND_API_KEY, and MAIL_FROM).');
        else console.warn(`[dev] No email provider configured. Password reset code for ${user.email}: ${code}`);
      }
    } catch (mailError) { console.error('Could not send the password reset email:', mailError.message); }
    reply();
  } catch (error) {
    console.error('forgot-password error:', error.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const code = String(req.body?.code || '').trim();
    const password = String(req.body?.password || '');
    const invalid = () => res.status(400).json({ message: 'That code is invalid or has expired. Request a new one.' });
    if (!email || !/^\d{6}$/.test(code)) return invalid();
    if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
    const user = await User.findOne({ email });
    if (!user) return invalid();
    const entry = await PasswordReset.findOne({ userId: user._id });
    if (!entry || entry.expiresAt < new Date()) return invalid();
    if (entry.attempts >= 5) { await entry.deleteOne(); return res.status(429).json({ message: 'Too many wrong codes. Request a new one.' }); }
    const given = Buffer.from(hashResetCode(code), 'hex'); const stored = Buffer.from(entry.codeHash, 'hex');
    if (given.length !== stored.length || !crypto.timingSafeEqual(given, stored)) { entry.attempts += 1; await entry.save(); return invalid(); }
    const passwordData = hashPassword(password);
    user.passwordSalt = passwordData.salt; user.passwordHash = passwordData.hash;
    await user.save();
    await PasswordReset.deleteMany({ userId: user._id });
    res.status(200).json({ message: 'Password updated successfully. You can sign in now.' });
  } catch (error) {
    console.error('reset-password error:', error.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

app.get('/api/schools/search', async (req, res) => {
  req.query.keyword = req.query.q || req.query.keyword;
  return schoolListHandler(req, res);
});

app.get('/api/schools', async (req, res) => schoolListHandler(req, res));

const PLACE_ALIASES = {
  uk: 'United Kingdom', 'u.k.': 'United Kingdom', britain: 'United Kingdom', 'great britain': 'United Kingdom',
  usa: 'United States', us: 'United States', america: 'United States', 'united states of america': 'United States',
  uae: 'United Arab Emirates', drc: 'Democratic Republic of the Congo',
};
const COUNTRY_NAME_BY_ISO2 = (() => {
  try { return Object.fromEntries(require('./scripts/countries.json').map((c) => [c.iso2, c.name])); } catch { return {}; }
})();

// Locations for the Explore filter: countries that actually have schools (most schools first, the
// caller's own country pinned on top), and the top cities of a chosen country.
app.get('/api/schools/locations', async (req, res) => {
  try {
    const country = String(req.query.country || '').trim();
    if (country) {
      const cities = await School.aggregate([
        { $match: { country: new RegExp(`^${escapeRegex(country)}$`, 'i'), city: { $nin: ['', null] } } },
        { $group: { _id: '$city', count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } }, { $limit: 20 },
      ]);
      return res.json({ cities: cities.map((c) => ({ name: c._id, count: c.count })) });
    }
    const rows = await School.aggregate([
      { $match: { country: { $nin: ['', null] } } },
      { $group: { _id: '$country', count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } }, { $limit: 40 },
    ]);
    let countries = rows.map((r) => ({ name: r._id, count: r.count }));
    const home = COUNTRY_NAME_BY_ISO2[String(req.query.home || '').toUpperCase()];
    if (home) {
      const found = countries.find((c) => c.name.toLowerCase() === home.toLowerCase());
      countries = [found || { name: home, count: 0 }, ...countries.filter((c) => c !== found)];
    }
    res.json({ countries, home: home || '' });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// Schools whose owner has an active featured-capable subscription (Premium or Featured Listing).
async function featuredSchoolIds() {
  const userIds = await Subscription.find({ planKey: { $in: FEATURED_PLAN_KEYS }, status: 'active', endsAt: { $gt: new Date() } }).distinct('userId');
  if (!userIds.length) return [];
  const schools = await School.find({ claimedBy: { $in: userIds }, verified: true }).select('_id').lean();
  return schools.map((x) => x._id);
}

async function schoolListHandler(req, res) {
  try {
    const keyword = String(queryValue(req.query, 'keyword') || queryValue(req.query, 'q') || '').trim();
    const types = String(queryValue(req.query, 'types') || queryValue(req.query, 'schoolType') || '')
      .split(',').map(v => v.trim()).filter(Boolean);
    const location = String(queryValue(req.query, 'location') || '').trim();
    const country = String(queryValue(req.query, 'country') || '').trim();
    const region = String(queryValue(req.query, 'region') || '').trim();
    const city = String(queryValue(req.query, 'city') || '').trim();
    const facility = String(queryValue(req.query, 'facility') || '').trim();
    const rating = Math.max(0, Number(queryValue(req.query, 'rating') || 0));
    const priceRange = String(queryValue(req.query, 'priceRange') || '').split(',').map(Number);
    const minFees = Number.isFinite(priceRange[0]) ? Math.max(0, priceRange[0]) : 0;
    const maxFees = Number.isFinite(priceRange[1]) ? Math.max(minFees, priceRange[1]) : Number.MAX_SAFE_INTEGER;
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '20', 10)));

    const filter = {};
    // Rating and fee filters only apply when the caller sets them, so unverified (no fee/rating) schools stay searchable.
    if (rating > 0) filter.rating = { $gte: rating };
    // Schools with no published fee (imported/unverified) stay in results; only known fees outside the range are excluded.
    if (String(queryValue(req.query, 'priceRange') || '').trim()) {
      filter.$and = [{ $or: [{ fees: null }, { fees: { $gte: minFees, $lte: maxFees } }] }];
    }
    if (String(queryValue(req.query, 'verifiedOnly') || '') === 'true') filter.verificationStatus = 'verified';
    if (types.length) filter.type = { $in: types.map(t => new RegExp(`^${escapeRegex(t)}$`, 'i')) };
    if (location) filter.location = new RegExp(escapeRegex(location), 'i');
    if (country) filter.country = new RegExp(escapeRegex(country), 'i');
    if (region) filter.region = new RegExp(escapeRegex(region), 'i');
    if (city) filter.city = new RegExp(escapeRegex(city), 'i');
    if (facility) filter.facilities = new RegExp(escapeRegex(facility), 'i');
    // If the keyword is a place (country, nation of the UK, region or city) search by place only,
    // so "England" returns schools in England rather than schools with "England" in their name.
    const placeTerm = keyword ? (PLACE_ALIASES[keyword.toLowerCase()] || keyword) : '';
    const placeRegex = placeTerm ? new RegExp(`^${escapeRegex(placeTerm)}$`, 'i') : null;
    const isPlace = placeRegex && await School.exists({ $or: [{ country: placeRegex }, { region: placeRegex }, { city: placeRegex }] });
    if (isPlace) {
      const pf = [{ country: placeRegex }, { region: placeRegex }, { city: placeRegex }];
      filter.$and = [...(filter.$and || []), { $or: pf }];
    } else if (keyword) {
      const safe = new RegExp(escapeRegex(keyword), 'i');
      filter.$or = [{ name: safe }, { location: safe }, { country: safe }, { region: safe }, { city: safe }, { description: safe }, { programs: safe }, { facilities: safe }];
    }

    // Featured (paid) schools are listed first, then everyone else in the usual order.
    const featuredIds = await featuredSchoolIds();
    const withIds = (op) => ({ ...filter, $and: [...(filter.$and || []), { _id: op }] });
    const sortOrder = { verified: -1, rating: -1, name: 1 };
    const offset = (page - 1) * limit;
    const featuredCount = featuredIds.length ? await School.countDocuments(withIds({ $in: featuredIds })) : 0;
    let schools;
    if (featuredCount && offset < featuredCount) {
      const top = await School.find(withIds({ $in: featuredIds })).sort(sortOrder).skip(offset).limit(limit);
      const rest = top.length < limit ? await School.find(withIds({ $nin: featuredIds })).sort(sortOrder).limit(limit - top.length) : [];
      schools = [...top, ...rest];
    } else {
      schools = await School.find(featuredCount ? withIds({ $nin: featuredIds }) : filter).sort(sortOrder).skip(featuredCount ? offset - featuredCount : offset).limit(limit);
    }
    const total = await School.countDocuments(filter);
    const featuredSet = new Set(featuredIds.map(String));
    SearchLog.create({ userId: null, query: keyword, filters: { types, location, country, region, city, facility, rating, minFees, maxFees } }).catch(() => {});
    res.status(200).json({ schools: schools.map((sc) => ({ ...serializeSchool(sc), featured: featuredSet.has(String(sc._id)) })), page, limit, total, pages: Math.ceil(total / limit) });
  } catch (error) { res.status(500).json({ message: error.message }); }
}

app.get('/api/schools/nearby', async (req, res) => {
  try {
    const latitude = Number(req.query.lat);
    const longitude = Number(req.query.lng);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return res.status(400).json({ message: 'Valid latitude and longitude are required' });
    }
    // radius (km) is optional. Without it we return the nearest schools anywhere in the world,
    // closest first, so a user in an area with few listings still sees their nearest options.
    const radius = Number(req.query.radius);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '50', 10)));
    const nearSphere = { $geometry: { type: 'Point', coordinates: [longitude, latitude] } };
    if (Number.isFinite(radius) && radius > 0) nearSphere.$maxDistance = radius * 1000;
    // $nearSphere already returns documents ordered by distance.
    const schools = await School.find({ geo: { $nearSphere: nearSphere } }).limit(limit);
    // Unverified schools are listed too, but serializeSchool() reduces them to the locked basic profile.
    const results = schools.map((school) => ({
      ...serializeSchool(school),
      distance: distanceInKilometres(latitude, longitude, school.latitude, school.longitude),
    }));
    res.status(200).json({ schools: results });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/schools/:id', async (req, res) => {
  try {
    const school = await School.findById(req.params.id);
    if (!school) return res.status(404).json({ message: 'School not found' });
    SchoolEvent.create({ schoolId: school._id, type: 'view' }).catch(() => {});
    const viewer = await authenticatedUser(req);
    // serializeSchool() deliberately strips the raw claimedBy id (it shouldn't be public), so the
    // only way for the frontend to know "is this me?" is this explicit, viewer-scoped boolean -
    // computed from the un-stripped document, before serialization removes the field.
    const isMyClaimedSchool = Boolean(viewer && school.claimedBy && school.claimedBy.toString() === viewer._id.toString());
    res.status(200).json({ ...serializeSchool(school), isMyClaimedSchool });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/schools', async (req, res) => {
  try {
    const currentUser = await requireAuth(req, res);
    if (!currentUser) return;
    if (!isAdminRole(currentUser.userType)) {
      return res.status(403).json({ message: 'Only administrators can add schools directly. School representatives submit for review via /api/admin/schools.' });
    }
    const { name, location, latitude, longitude, type, fees } = req.body;
    if (!name || !location || !type || !Number.isFinite(Number(fees))) {
      return res.status(400).json({ message: 'name, location, type and fees are required' });
    }
    const school = await School.create({
      name: String(name).trim(),
      location: String(location).trim(),
      latitude: Number(latitude) || 0,
      longitude: Number(longitude) || 0,
      type: String(type).trim(),
      fees: Number(fees),
      description: String(req.body.description || '').trim(),
      facilities: Array.isArray(req.body.facilities) ? req.body.facilities : [],
      imageUrl: String(req.body.imageUrl || ''),
      verificationStatus: 'verified',
      source: 'schulloop',
      country: String(req.body.country || '').trim(),
      region: String(req.body.region || '').trim(),
      city: String(req.body.city || '').trim(),
    });
    res.status(201).json({ school });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --- School admissions and application confirmations ---
function createAdmissionApplicationNumber() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `SLA-${stamp}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

async function createAdmissionConfirmationPdf(applicationId) {
  const application = await AdmissionApplication.findById(applicationId).populate('schoolId').populate('userId');
  if (!application) return null;
  const filename = `${application.applicationNumber}.pdf`;
  const pdfPath = path.join(RECEIPT_DIR, filename);
  if (fs.existsSync(pdfPath)) return { application, pdfPath };
  const doc = new PDFDocument({ margin: 48 });
  const stream = fs.createWriteStream(pdfPath);
  doc.pipe(stream);
  doc.fontSize(22).text('SCHULLOOP', { align: 'center' });
  doc.fontSize(11).text('Global Education & Student Platform', { align: 'center' });
  doc.moveDown();
  doc.fontSize(18).text('ADMISSION APPLICATION CONFIRMATION', { align: 'center' });
  doc.moveDown();
  doc.fontSize(11).text(`Application Number: ${application.applicationNumber}`);
  doc.text(`Submitted: ${new Date(application.submittedAt).toLocaleString()}`);
  doc.text(`Status: ${String(application.status).replace('_', ' ').toUpperCase()}`);
  doc.moveDown();
  doc.fontSize(14).text('Applicant');
  doc.fontSize(11).text(`Name: ${application.userId?.fullName || 'N/A'}`);
  doc.text(`Email: ${application.userId?.email || 'N/A'}`);
  doc.moveDown();
  doc.fontSize(14).text('School and Programme');
  doc.fontSize(11).text(`School: ${application.schoolId?.name || 'N/A'}`);
  doc.text(`Location: ${application.schoolId?.location || application.schoolId?.city || 'Not listed'}`);
  doc.text(`Programme: ${application.program}`);
  doc.text(`Academic year: ${application.academicYear}`);
  doc.moveDown();
  doc.fontSize(10).text('This document confirms that SchulLoop recorded the application. It is not an admission offer and is not proof of payment. Any required fee will have a separate payment receipt after the payment is verified.');
  doc.end();
  await new Promise((resolve, reject) => { stream.on('finish', resolve); stream.on('error', reject); });
  return { application, pdfPath };
}

app.post('/api/schools/:id/admissions', async (req, res) => {
  try {
    const currentUser = await requireAuth(req, res);
    if (!currentUser) return;
    if (!['student', 'parent'].includes(currentUser.userType)) return res.status(403).json({ message: 'Only student or parent accounts can submit admission applications' });
    const school = await School.findById(req.params.id);
    if (!school) return res.status(404).json({ message: 'School not found' });
    if (!school.verified) return res.status(403).json({ message: 'You can apply only to a verified school' });
    const program = String(req.body.program || '').trim();
    const academicYear = String(req.body.academicYear || '').trim();
    const personalStatement = String(req.body.personalStatement || '').trim();
    if (!program || !academicYear) return res.status(400).json({ message: 'Programme and academic year are required' });
    if (program.length > 160 || academicYear.length > 40 || personalStatement.length > 3000) return res.status(400).json({ message: 'One or more application fields exceed the allowed length' });
    const applicationNumber = createAdmissionApplicationNumber();
    const application = await AdmissionApplication.create({
      applicationNumber, schoolId: school._id, userId: currentUser._id,
      program, academicYear, personalStatement, status: 'submitted',
    });
    await createAdmissionConfirmationPdf(application._id);
    await notifyUser(currentUser._id, 'admission', `Your application ${applicationNumber} was submitted to ${school.name}.`);
    return res.status(201).json({
      application: { ...application.toObject(), schoolName: school.name },
      confirmation: { applicationNumber, downloadPath: `/api/admissions/${application._id}/confirmation` },
      message: 'Application submitted. Your confirmation document is ready. This is not an admission offer or payment receipt.',
    });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'You have already applied to this programme for that academic year' });
    return res.status(500).json({ message: error.message });
  }
});

app.get('/api/admissions/mine', async (req, res) => {
  try {
    const currentUser = await requireAuth(req, res);
    if (!currentUser) return;
    const applications = await AdmissionApplication.find({ userId: currentUser._id }).populate('schoolId', 'name location city country verified verificationStatus imageUrl').sort({ submittedAt: -1 });
    return res.json({ applications });
  } catch (error) { return res.status(500).json({ message: error.message }); }
});

app.get('/api/admissions/:id/confirmation', async (req, res) => {
  try {
    const currentUser = await requireAuth(req, res);
    if (!currentUser) return;
    const application = await AdmissionApplication.findById(req.params.id);
    if (!application) return res.status(404).json({ message: 'Admission application not found' });
    if (application.userId.toString() !== currentUser._id.toString() && !isAdminRole(currentUser.userType)) return res.status(403).json({ message: 'Access denied' });
    const result = await createAdmissionConfirmationPdf(application._id);
    if (!result || !fs.existsSync(result.pdfPath)) return res.status(500).json({ message: 'Confirmation document could not be generated' });
    return res.download(result.pdfPath, `${application.applicationNumber}.pdf`);
  } catch (error) { return res.status(500).json({ message: error.message }); }
});

app.put('/api/admissions/:id/status', async (req, res) => {
  try {
    const currentUser = await requireAuth(req, res);
    if (!currentUser) return;
    const application = await AdmissionApplication.findById(req.params.id).populate('schoolId', 'claimedBy');
    if (!application) return res.status(404).json({ message: 'Admission application not found' });
    const isSchoolRep = application.schoolId?.claimedBy && application.schoolId.claimedBy.toString() === currentUser._id.toString();
    if (!isAdminRole(currentUser.userType) && !isSchoolRep) return res.status(403).json({ message: 'Only the school representative or an administrator can update admission status' });
    const allowed = ['under_review', 'accepted', 'rejected'];
    if (!allowed.includes(req.body.status)) return res.status(400).json({ message: 'Invalid admission status' });
    application.status = req.body.status;
    await application.save();
    // Rebuild the confirmation PDF on next download so the displayed status is current.
    const oldConfirmationPath = path.join(RECEIPT_DIR, `${application.applicationNumber}.pdf`);
    if (fs.existsSync(oldConfirmationPath)) fs.unlinkSync(oldConfirmationPath);
    await notifyUser(application.userId, 'admission', `Your application ${application.applicationNumber} status is now ${application.status.replace('_', ' ')}.`);
    return res.json({ application });
  } catch (error) { return res.status(500).json({ message: error.message }); }
});

app.get('/api/schools/:id/reviews', async (req, res) => {
  try {
    const school = await School.findById(req.params.id);
    if (!school) return res.status(404).json({ message: 'School not found' });
    if (!school.verified) return res.status(200).json({ reviews: [], locked: true });
    const reviews = await Review.find({ schoolId: school._id, status: 'approved' });
    res.status(200).json({ reviews });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/schools/:id/reviews', async (req, res) => {
  try {
    const currentUser = await requireAuth(req, res);
    if (!currentUser) return;
    const school = await School.findById(req.params.id);
    if (!school) return res.status(404).json({ message: 'School not found' });
    if (!school.verified) return res.status(403).json({ message: 'Reviews are available once a school is verified' });

    const { rating, comment } = req.body;
    const parsedRating = Number(rating);
    const trimmedComment = String(comment || '').trim();
    if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5 || !trimmedComment) {
      return res.status(400).json({ message: 'Rating from 1 to 5 and a comment are required' });
    }

    const existingReview = await Review.findOne({ schoolId: school._id, userId: currentUser._id });
    if (existingReview) return res.status(409).json({ message: 'You already reviewed this school' });

    const review = new Review({
      schoolId: school._id,
      userId: currentUser._id,
      author: currentUser.fullName,
      rating: parsedRating,
      comment: trimmedComment,
      status: 'approved',
    });
    await review.save();
    const stats = await Review.aggregate([{ $match: { schoolId: school._id, status: 'approved' } }, { $group: { _id: null, avg: { $avg: '$rating' } } }]);
    school.rating = stats[0]?.avg ? Number(stats[0].avg.toFixed(1)) : 0;
    await school.save();
    res.status(201).json({ message: 'Review submitted', review });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// LinkedIn-style public profile: anyone signed in can view it (own visibility rules still apply -
// a user with profileVisibility off is only visible to themselves), and the response includes
// the connection count, this viewer's relationship to them, their skill endorsement counts,
// Authenticated account profile. Only explicitly editable, non-privileged fields are accepted.
app.get('/api/profile/me', async (req, res) => {
  try {
    const user = await requireAuth(req, res);
    if (!user) return;
    res.json({ user: publicUser(user) });
  } catch (error) { res.status(500).json({ message: 'Could not load profile' }); }
});

app.put('/api/profile/me', async (req, res) => {
  try {
    const user = await requireAuth(req, res);
    if (!user) return;
    const allowed = ['fullName', 'phone', 'country', 'studyGoal', 'bio', 'avatarUrl'];
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body || {}, key)) {
        if (typeof req.body[key] !== 'string') return res.status(400).json({ message: `${key} must be text` });
        const value = req.body[key].trim();
        if (value.length > (key === 'bio' ? 2000 : 160)) return res.status(400).json({ message: `${key} is too long` });
        if (key === 'fullName' && !value) return res.status(400).json({ message: 'Full name is required' });
        user[key] = value;
      }
    }
    await user.save();
    res.json({ user: publicUser(user), message: 'Profile saved successfully' });
  } catch (error) { res.status(500).json({ message: 'Could not save profile' }); }
});

// recommendations received, and their most recent posts - everything a profile page needs in
// one request.
app.get('/api/users/:id', async (req, res) => {
  try {
    const viewer = await authenticatedUser(req);
    const user = await User.findById(req.params.id);
    const isSelf = viewer && viewer._id.toString() === req.params.id;
    if (!user || user.active === false || (user.profileVisibility === false && !isSelf)) {
      return res.status(404).json({ message: 'User not found' });
    }

    const [connectionIds, endorsements, recommendations, posts] = await Promise.all([
      acceptedConnectionIds(user._id),
      Endorsement.find({ userId: user._id }),
      Recommendation.find({ userId: user._id }).populate('fromUserId', 'fullName avatarUrl').sort({ createdAt: -1 }),
      Post.find({ userId: user._id }).sort({ createdAt: -1 }).limit(20),
    ]);

    const endorsementCounts = {};
    const endorsedByViewer = new Set();
    for (const e of endorsements) {
      endorsementCounts[e.skill] = (endorsementCounts[e.skill] || 0) + 1;
      if (viewer && e.endorserId.toString() === viewer._id.toString()) endorsedByViewer.add(e.skill);
    }

    res.json({
      user: publicUser(user),
      connectionCount: connectionIds.length,
      connectionStatus: viewer ? await connectionStatusBetween(viewer._id, user._id) : 'none',
      endorsements: (user.skills || []).map((skill) => ({
        skill, count: endorsementCounts[skill] || 0, endorsedByViewer: endorsedByViewer.has(skill),
      })),
      recommendations: recommendations.map((r) => ({
        id: r._id, text: r.text, createdAt: r.createdAt,
        from: r.fromUserId ? { id: r.fromUserId._id, fullName: r.fromUserId.fullName, avatarUrl: r.fromUserId.avatarUrl || '' } : null,
      })),
      posts: posts.map((p) => ({ id: p._id, text: p.text, createdAt: p.createdAt })),
    });
  } catch (error) { res.status(400).json({ message: 'Invalid user id' }); }
});

// "People you may know": visible users who are not already connected, blocked, or pending with
// the viewer. Users who share a school (by educationHistory.schoolId, falling back to a matching
// school name) are ranked first, since a shared school is the strongest, most relevant signal
// this platform has - something a generic network like LinkedIn can't do as precisely.
app.get('/api/connect/suggestions', async (req, res) => {
  try {
    const currentUser = await requireAuth(req, res);
    if (!currentUser) return;
    const limit = Math.min(25, Math.max(1, parseInt(req.query.limit || '10', 10)));

    const [existingConnections, blockedBy] = await Promise.all([
      Connection.find({ $or: [{ fromUserId: currentUser._id }, { toUserId: currentUser._id }] }),
      User.find({ blockedUserIds: currentUser._id }, '_id'),
    ]);
    const excludedIds = new Set([currentUser._id.toString()]);
    existingConnections.forEach((c) => {
      excludedIds.add(c.fromUserId.toString());
      excludedIds.add(c.toUserId.toString());
    });
    (currentUser.blockedUserIds || []).forEach((id) => excludedIds.add(id.toString()));
    blockedBy.forEach((u) => excludedIds.add(u._id.toString()));

    const candidates = await User.find({
      _id: { $nin: Array.from(excludedIds) },
      profileVisibility: true,
      active: true,
      userType: { $in: ['student', 'graduate'] },
    }).limit(200);

    // Only a VERIFIED school counts as a trustworthy "same school" signal - matching on a
    // school name someone just typed in (unverified) would be easy to fake or mistype into a
    // false match, so that signal is deliberately not used here.
    const allSchoolIds = new Set();
    [currentUser, ...candidates].forEach((u) => (u.educationHistory || []).forEach((e) => e.schoolId && allSchoolIds.add(e.schoolId.toString())));
    const verifiedSchoolIds = new Set(
      (await School.find({ _id: { $in: Array.from(allSchoolIds) }, verificationStatus: 'verified' }, '_id')).map((sc) => sc._id.toString())
    );
    const mySchoolIds = new Set(
      (currentUser.educationHistory || []).filter((e) => e.schoolId && verifiedSchoolIds.has(e.schoolId.toString())).map((e) => e.schoolId.toString())
    );

    const scored = candidates.map((u) => {
      const theirSchoolIds = (u.educationHistory || []).filter((e) => e.schoolId && verifiedSchoolIds.has(e.schoolId.toString())).map((e) => e.schoolId.toString());
      const sharesSchool = theirSchoolIds.some((id) => mySchoolIds.has(id));
      return { user: u, sharesSchool };
    });
    scored.sort((a, b) => Number(b.sharesSchool) - Number(a.sharesSchool));

    res.status(200).json({
      users: scored.slice(0, limit).map(({ user, sharesSchool }) => ({ ...publicUser(user), sharesSchool })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// A user's accepted connections, for showing a connection list on their own profile.
app.get('/api/connect/connections', async (req, res) => {
  try {
    const currentUser = await requireAuth(req, res);
    if (!currentUser) return;
    const connections = await Connection.find({
      status: 'accepted',
      $or: [{ fromUserId: currentUser._id }, { toUserId: currentUser._id }],
    }).populate('fromUserId toUserId');
    const users = connections.map((c) =>
      c.fromUserId._id.toString() === currentUser._id.toString() ? c.toUserId : c.fromUserId
    );
    res.status(200).json({ users: users.map(publicUser) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Endorse one of a connection's listed skills. Mirrors LinkedIn's rule of thumb: you can only
// endorse people you're actually connected to, one endorsement per skill per endorser.
app.post('/api/users/:id/endorse', async (req, res) => {
  try {
    const currentUser = await requireAuth(req, res);
    if (!currentUser) return;
    const targetId = req.params.id;
    if (targetId === currentUser._id.toString()) return res.status(400).json({ message: 'You cannot endorse yourself' });
    const status = await connectionStatusBetween(currentUser._id, targetId);
    if (status !== 'connected') return res.status(403).json({ message: 'You can only endorse a connection' });

    const skill = String(req.body.skill || '').trim();
    const target = await User.findById(targetId).select('skills');
    if (!target) return res.status(404).json({ message: 'User not found' });
    if (!(target.skills || []).includes(skill)) return res.status(400).json({ message: 'That is not one of this user\'s listed skills' });

    try {
      await Endorsement.create({ userId: targetId, endorserId: currentUser._id, skill });
    } catch (error) {
      if (error.code !== 11000) throw error; // already endorsed - treat as success, not an error
    }
    const count = await Endorsement.countDocuments({ userId: targetId, skill });
    res.status(200).json({ skill, count, endorsedByViewer: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/users/:id/endorse/:skill', async (req, res) => {
  try {
    const currentUser = await requireAuth(req, res);
    if (!currentUser) return;
    await Endorsement.deleteOne({ userId: req.params.id, endorserId: currentUser._id, skill: req.params.skill });
    const count = await Endorsement.countDocuments({ userId: req.params.id, skill: req.params.skill });
    res.status(200).json({ skill: req.params.skill, count, endorsedByViewer: false });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Write a short recommendation for a connection. One recommendation per (author, recipient) pair -
// writing again replaces the previous text, same as LinkedIn only shows your latest.
app.post('/api/users/:id/recommendations', async (req, res) => {
  try {
    const currentUser = await requireAuth(req, res);
    if (!currentUser) return;
    const targetId = req.params.id;
    if (targetId === currentUser._id.toString()) return res.status(400).json({ message: 'You cannot recommend yourself' });
    const status = await connectionStatusBetween(currentUser._id, targetId);
    if (status !== 'connected') return res.status(403).json({ message: 'You can only recommend a connection' });
    const text = String(req.body.text || '').trim();
    if (!text) return res.status(400).json({ message: 'Recommendation text is required' });

    const recommendation = await Recommendation.findOneAndUpdate(
      { userId: targetId, fromUserId: currentUser._id },
      { text, createdAt: new Date() },
      { upsert: true, new: true }
    );
    await notifyUser(targetId, 'recommendation', `${currentUser.fullName} wrote you a recommendation.`);
    res.status(201).json({ recommendation });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --- School Groups (class cohorts, clubs, study groups, announcements, alumni groups) ---
// Only the person who claimed AND was verified for a school can run its groups - a school's own
// representative, not the platform admin, and not a school that only claims to exist but hasn't
// been checked.
async function requireSchoolAdmin(schoolId, req, res) {
  const currentUser = await requireAuth(req, res);
  if (!currentUser) return null;
  const school = await School.findById(schoolId);
  if (!school) { res.status(404).json({ message: 'School not found' }); return null; }
  if (school.verificationStatus !== 'verified') {
    res.status(403).json({ message: 'This school must be verified before it can create groups' });
    return null;
  }
  if (!school.claimedBy || school.claimedBy.toString() !== currentUser._id.toString()) {
    res.status(403).json({ message: 'Only this school\'s verified representative can manage its groups' });
    return null;
  }
  return { currentUser, school };
}

function serializeGroup(group, viewerId) {
  return {
    id: group._id, schoolId: group.schoolId, name: group.name, description: group.description,
    type: group.type, memberCount: group.memberIds.length,
    isMember: viewerId ? group.memberIds.some((id) => id.toString() === viewerId.toString()) : false,
    isAdmin: viewerId ? group.createdBy.toString() === viewerId.toString() : false,
  };
}

app.post('/api/schools/:id/groups', async (req, res) => {
  try {
    const auth = await requireSchoolAdmin(req.params.id, req, res);
    if (!auth) return;
    const { name, description, type } = req.body;
    if (!String(name || '').trim()) return res.status(400).json({ message: 'A group name is required' });
    if (!['class', 'club', 'study', 'announcements', 'alumni'].includes(type)) {
      return res.status(400).json({ message: 'type must be one of: class, club, study, announcements, alumni' });
    }
    const group = await Group.create({
      schoolId: req.params.id, name: String(name).trim(), description: String(description || '').trim(),
      type, createdBy: auth.currentUser._id, memberIds: [auth.currentUser._id],
    });
    res.status(201).json({ group: serializeGroup(group, auth.currentUser._id) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Anyone can see what groups a (verified) school runs, so they know what to join - matches how
// the rest of this app treats a school's basic info as publicly browsable.
app.get('/api/schools/:id/groups', async (req, res) => {
  try {
    const viewer = await authenticatedUser(req);
    const groups = await Group.find({ schoolId: req.params.id }).sort({ createdAt: -1 });
    res.status(200).json({ groups: groups.map((g) => serializeGroup(g, viewer?._id)) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/groups/:id/join', async (req, res) => {
  try {
    const currentUser = await requireAuth(req, res);
    if (!currentUser) return;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (!group.memberIds.some((id) => id.toString() === currentUser._id.toString())) {
      group.memberIds.push(currentUser._id);
      await group.save();
    }
    res.status(200).json({ group: serializeGroup(group, currentUser._id) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/groups/:id/leave', async (req, res) => {
  try {
    const currentUser = await requireAuth(req, res);
    if (!currentUser) return;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (group.createdBy.toString() === currentUser._id.toString()) {
      return res.status(400).json({ message: 'The group\'s creator cannot leave their own group - delete it instead' });
    }
    group.memberIds = group.memberIds.filter((id) => id.toString() !== currentUser._id.toString());
    await group.save();
    res.status(200).json({ group: serializeGroup(group, currentUser._id) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/groups/:id', async (req, res) => {
  try {
    const currentUser = await requireAuth(req, res);
    if (!currentUser) return;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (group.createdBy.toString() !== currentUser._id.toString()) {
      return res.status(403).json({ message: 'Only this group\'s creator can delete it' });
    }
    await Promise.all([Group.deleteOne({ _id: group._id }), GroupPost.deleteMany({ groupId: group._id })]);
    res.status(200).json({ deleted: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/groups/:id/posts', async (req, res) => {
  try {
    const currentUser = await requireAuth(req, res);
    if (!currentUser) return;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    const isMember = group.memberIds.some((id) => id.toString() === currentUser._id.toString());
    const isAdmin = group.createdBy.toString() === currentUser._id.toString();
    if (!isMember) return res.status(403).json({ message: 'Join this group to post in it' });
    // An announcements channel is one-way: only the school's group admin can post; members read.
    if (group.type === 'announcements' && !isAdmin) {
      return res.status(403).json({ message: 'Only this group\'s admin can post announcements' });
    }
    const text = String(req.body.text || '').trim();
    if (!text) return res.status(400).json({ message: 'Post text is required' });
    const post = await GroupPost.create({ groupId: group._id, userId: currentUser._id, text });
    res.status(201).json({ post: { id: post._id, text: post.text, createdAt: post.createdAt, author: publicUser(currentUser) } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/groups/:id/posts', async (req, res) => {
  try {
    const currentUser = await requireAuth(req, res);
    if (!currentUser) return;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (!group.memberIds.some((id) => id.toString() === currentUser._id.toString())) {
      return res.status(403).json({ message: 'Join this group to see its posts' });
    }
    const posts = await GroupPost.find({ groupId: group._id }).sort({ createdAt: -1 }).populate('userId', 'fullName avatarUrl');
    res.status(200).json({
      posts: posts.map((p) => ({
        id: p._id, text: p.text, createdAt: p.createdAt,
        author: p.userId ? { id: p.userId._id, fullName: p.userId.fullName, avatarUrl: p.userId.avatarUrl || '' } : null,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --- Network Feed (posts from your connections, LinkedIn-home-style) ---
app.post('/api/posts', async (req, res) => {
  try { const currentUser=await requireAuth(req,res); if(!currentUser)return; const text=String(req.body.text||'').trim(); const mediaUrls=Array.isArray(req.body.mediaUrls)?req.body.mediaUrls.slice(0,8).map(String):[]; const mediaTypes=Array.isArray(req.body.mediaTypes)?req.body.mediaTypes.slice(0,8).map(String):[]; if(!text&&!mediaUrls.length)return res.status(400).json({message:'Post text or media is required'}); if(text.length>2000)return res.status(400).json({message:'Post is too long'}); const post=await Post.create({userId:currentUser._id,text,mediaUrls,mediaTypes,visibility:req.body.visibility==='public'?'public':'connections'}); res.status(201).json({post:{id:post._id,text:post.text,mediaUrls:post.mediaUrls,mediaTypes:post.mediaTypes,likes:0,comments:[],createdAt:post.createdAt,author:publicUser(currentUser)}}); } catch(error){res.status(500).json({message:error.message});}
});
app.get('/api/feed', async(req,res)=>{try{const currentUser=await requireAuth(req,res);if(!currentUser)return;const limit=Math.min(50,Math.max(1,parseInt(req.query.limit||'20',10)));const connectionIds=await acceptedConnectionIds(currentUser._id);const posts=await Post.find({$or:[{userId:{$in:[currentUser._id,...connectionIds]}},{visibility:'public'}]}).sort({createdAt:-1}).limit(limit).populate('userId','fullName avatarUrl userType');res.json({posts:posts.map(p=>({id:p._id,text:p.text,mediaUrls:p.mediaUrls||[],mediaTypes:p.mediaTypes||[],likes:(p.likes||[]).length,likedByMe:(p.likes||[]).some(id=>id.toString()===currentUser._id.toString()),comments:(p.comments||[]).map(c=>({id:c._id,userId:c.userId,text:c.text,createdAt:c.createdAt})),createdAt:p.createdAt,author:p.userId?{id:p.userId._id,fullName:p.userId.fullName,avatarUrl:p.userId.avatarUrl||'',userType:p.userId.userType}:null}))});}catch(error){res.status(500).json({message:error.message});}});
app.post('/api/posts/:id/like',async(req,res)=>{try{const user=await requireAuth(req,res);if(!user)return;const post=await Post.findById(req.params.id);if(!post)return res.status(404).json({message:'Post not found'});const i=post.likes.findIndex(id=>id.toString()===user._id.toString());if(i>=0)post.likes.splice(i,1);else post.likes.push(user._id);await post.save();res.json({liked:i<0,likes:post.likes.length});}catch(e){res.status(500).json({message:e.message});}});
app.post('/api/posts/:id/comments',async(req,res)=>{try{const user=await requireAuth(req,res);if(!user)return;const text=String(req.body.text||'').trim();if(!text)return res.status(400).json({message:'Comment is required'});const post=await Post.findById(req.params.id);if(!post)return res.status(404).json({message:'Post not found'});post.comments.push({userId:user._id,text});await post.save();res.status(201).json({comments:post.comments});}catch(e){res.status(500).json({message:e.message});}});

app.get('/api/jobs', async (req, res) => {
  try {
    const filter = { active: true };
    if (req.query.title) filter.title = new RegExp(escapeRegex(req.query.title), 'i');
    if (req.query.location) filter.location = new RegExp(escapeRegex(req.query.location), 'i');
    if (req.query.jobType) filter.jobType = new RegExp(escapeRegex(req.query.jobType), 'i');
    const jobs = await Job.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ jobs });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/jobs', async (req, res) => {
  try {
    const currentUser = await requireAuth(req, res);
    if (!currentUser) return;
    if (currentUser.userType !== 'employer' && !isAdminRole(currentUser.userType)) {
      return res.status(403).json({ message: 'Employer access required' });
    }
    const { title, company, location, salary, jobType, skills, description, companyLogo } = req.body;
    if (!String(title || '').trim() || !String(company || '').trim() || !String(location || '').trim()) {
      return res.status(400).json({ message: 'title, company and location are required' });
    }
    const job = await Job.create({
      title: String(title).trim(), company: String(company).trim(), location: String(location).trim(),
      salary: String(salary || '').trim(), jobType: String(jobType || 'Full-time').trim(),
      skills: Array.isArray(skills) ? skills.map(x => String(x).trim()).filter(Boolean).slice(0, 20) : [],
      description: String(description || '').trim().slice(0, 10000), companyLogo: String(companyLogo || '').trim(),
      employerId: currentUser._id,
    });
    res.status(201).json({ job });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.get('/api/employer/jobs', async (req, res) => {
  try {
    const currentUser = await requireAuth(req, res);
    if (!currentUser) return;
    if (currentUser.userType !== 'employer' && !isAdminRole(currentUser.userType)) return res.status(403).json({ message: 'Employer access required' });
    const jobs = await Job.find({ employerId: currentUser._id }).sort({ createdAt: -1 });
    res.json({ jobs });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.get('/api/employer/jobs/:id/applications', async (req, res) => {
  try {
    const currentUser = await requireAuth(req, res);
    if (!currentUser) return;
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    if (!isAdminRole(currentUser.userType) && String(job.employerId) !== String(currentUser._id)) return res.status(403).json({ message: 'Access denied' });
    const applications = await Application.find({ jobId: job._id }).populate('userId', 'fullName email bio skills avatarUrl educationHistory experience').sort({ appliedAt: -1 });
    res.json({ job, applications });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.put('/api/jobs/:id', async (req, res) => {
  try {
    const currentUser = await requireAuth(req, res);
    if (!currentUser) return;
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    if (!isAdminRole(currentUser.userType) && String(job.employerId) !== String(currentUser._id)) return res.status(403).json({ message: 'Access denied' });
    const allowed = ['title','company','location','salary','jobType','skills','description','companyLogo','active'];
    allowed.forEach(k => { if (req.body[k] !== undefined) job[k] = req.body[k]; });
    await job.save();
    res.json({ job });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.post('/api/jobs/:id/apply', async (req, res) => {
  try {
    const currentUser = await requireAuth(req, res);
    if (!currentUser) return;
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    const existing = await Application.findOne({ jobId: job._id, userId: currentUser._id });
    if (existing) return res.status(409).json({ message: 'You already applied for this job' });

    const application = new Application({
      jobId: job._id, userId: currentUser._id, jobTitle: job.title, company: job.company,
      status: 'pending', coverLetter: String(req.body.coverLetter || ''), resumeUrl: String(req.body.resumeUrl || ''),
    });
    await application.save();
    res.status(201).json({ application });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/applications/:id/status', async (req, res) => {
  try {
    const currentUser = await requireAuth(req, res);
    if (!currentUser) return;
    const application = await Application.findById(req.params.id);
    if (!application) return res.status(404).json({ message: 'Application not found' });
    const allowed = ['pending', 'reviewing', 'interview', 'accepted', 'rejected', 'withdrawn'];
    const status = String(req.body.status || '');
    if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid application status' });
    const ownsJob = application.jobId && (await Job.findById(application.jobId).select('employerId'));
    const isJobOwner = ownsJob && ownsJob.employerId && ownsJob.employerId.toString() === currentUser._id.toString();
    if (!isAdminRole(currentUser.userType) && application.userId.toString() !== currentUser._id.toString() && !isJobOwner) {
      return res.status(403).json({ message: 'Access denied' });
    }
    application.status = status;
    await application.save();
    res.json({ application });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.get('/api/graduates/:id/applications', async (req, res) => {
  try {
    const currentUser = await requireAuth(req, res);
    if (!currentUser) return;
    if (currentUser._id.toString() !== req.params.id && !isAdminRole(currentUser.userType)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const applications = await Application.find({ userId: req.params.id });
    res.status(200).json({ applications });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.route('/api/graduate/profile')
  .get(async (req, res) => {
    try {
      const currentUser = await requireAuth(req, res);
      if (!currentUser) return;
      res.status(200).json({ profile: publicUser(currentUser) });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  })
  .put(async (req, res) => {
    try {
      const currentUser = await requireAuth(req, res);
      if (!currentUser) return;
      const { bio, skills, education, profileVisibility, avatarUrl, educationHistory, experience } = req.body;
      currentUser.bio = String(bio || '').trim();
      currentUser.skills = Array.isArray(skills) ? skills.map((s) => String(s).trim()).filter(Boolean) : [];
      currentUser.education = education || null;
      if (avatarUrl !== undefined) currentUser.avatarUrl = String(avatarUrl || '').trim();
      if (Array.isArray(educationHistory)) {
        currentUser.educationHistory = educationHistory
          .filter((e) => e && String(e.school || '').trim())
          .map((e) => ({
            school: String(e.school).trim(),
            schoolId: e.schoolId || null,
            degree: String(e.degree || '').trim(),
            fieldOfStudy: String(e.fieldOfStudy || '').trim(),
            startYear: e.startYear ? Number(e.startYear) : null,
            endYear: e.endYear ? Number(e.endYear) : null,
          }));
      }
      if (Array.isArray(experience)) {
        currentUser.experience = experience
          .filter((e) => e && String(e.title || '').trim() && String(e.company || '').trim())
          .map((e) => ({
            title: String(e.title).trim(),
            company: String(e.company).trim(),
            location: String(e.location || '').trim(),
            startYear: e.startYear ? Number(e.startYear) : null,
            endYear: e.endYear ? Number(e.endYear) : null,
            current: Boolean(e.current),
            description: String(e.description || '').trim(),
          }));
      }
      if (profileVisibility !== undefined) currentUser.profileVisibility = profileVisibility;
      await currentUser.save();
      res.status(200).json({ profile: publicUser(currentUser) });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

app.get('/api/favorites', async (req, res) => {
  try {
    const currentUser = await requireAuth(req, res);
    if (!currentUser) return;
    const favorites = await Favorite.find({ userId: currentUser._id }).populate('schoolId');
    res.status(200).json({ schools: favorites.map(f => f.schoolId).filter(Boolean).map(serializeSchool) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/favorites/:schoolId', async (req, res) => {
  try {
    const currentUser = await requireAuth(req, res);
    if (!currentUser) return;
    const schoolId = req.params.schoolId;
    const exists = await Favorite.findOne({ userId: currentUser._id, schoolId });
    if (!exists) {
      await Favorite.create({ userId: currentUser._id, schoolId });
    }
    res.status(200).json({ saved: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/favorites/:schoolId', async (req, res) => {
  try {
    const currentUser = await requireAuth(req, res);
    if (!currentUser) return;
    await Favorite.deleteOne({ userId: currentUser._id, schoolId: req.params.schoolId });
    res.status(200).json({ saved: false });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --- Student Connect (FR-CONNECT-01 to 05) ---
app.get('/api/connect/users', async (req, res) => {
  try {
    const currentUser = await requireAuth(req, res);
    if (!currentUser) return;

    const [existingConnections, blockedBy] = await Promise.all([
      Connection.find({ $or: [{ fromUserId: currentUser._id }, { toUserId: currentUser._id }] }),
      User.find({ blockedUserIds: currentUser._id }, '_id'),
    ]);
    const relatedIds = new Set([currentUser._id.toString()]);
    existingConnections.forEach((c) => {
      relatedIds.add(c.fromUserId.toString());
      relatedIds.add(c.toUserId.toString());
    });
    (currentUser.blockedUserIds || []).forEach((id) => relatedIds.add(id.toString()));
    blockedBy.forEach((u) => relatedIds.add(u._id.toString()));

    const users = await User.find({
      _id: { $nin: Array.from(relatedIds) },
      profileVisibility: true,
      userType: { $in: ['student', 'graduate'] },
    });
    res.status(200).json({ users: users.map(publicUser) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/connect/requests', async (req, res) => {
  try {
    const currentUser = await requireAuth(req, res);
    if (!currentUser) return;
    const requests = await Connection.find({
      $or: [{ fromUserId: currentUser._id }, { toUserId: currentUser._id }],
    }).populate('fromUserId toUserId');
    res.status(200).json({ requests });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/connect/requests', async (req, res) => {
  try {
    const currentUser = await requireAuth(req, res);
    if (!currentUser) return;
    const toUserId = req.body.userId;
    if (!toUserId || toUserId === currentUser._id.toString()) {
      return res.status(400).json({ message: 'A valid target user is required' });
    }
    const targetUser = await User.findById(toUserId);
    if (!targetUser) return res.status(404).json({ message: 'User not found' });
    if ((targetUser.blockedUserIds || []).some((id) => id.toString() === currentUser._id.toString())) {
      return res.status(403).json({ message: 'Unable to connect with this user' });
    }
    const existing = await Connection.findOne({
      $or: [
        { fromUserId: currentUser._id, toUserId },
        { fromUserId: toUserId, toUserId: currentUser._id },
      ],
    });
    if (existing) return res.status(409).json({ message: 'A connection request already exists' });

    const request = await Connection.create({ fromUserId: currentUser._id, toUserId });
    await notifyUser(toUserId, 'connection_request', `${currentUser.fullName} sent you a connection request.`);
    res.status(201).json({ request });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/connect/requests/:id', async (req, res) => {
  try {
    const currentUser = await requireAuth(req, res);
    if (!currentUser) return;
    const request = await Connection.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.toUserId.toString() !== currentUser._id.toString()) {
      return res.status(403).json({ message: 'Only the recipient can respond to this request' });
    }
    const { status } = req.body;
    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'status must be accepted or rejected' });
    }
    request.status = status;
    await request.save();
    if (status === 'accepted') {
      await notifyUser(request.fromUserId, 'connection_accepted', `${currentUser.fullName} accepted your connection request.`);
    }
    res.status(200).json({ request });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/connect/requests/:id', async (req, res) => {
  try {
    const currentUser = await requireAuth(req, res);
    if (!currentUser) return;
    const request = await Connection.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    const isParticipant = [request.fromUserId.toString(), request.toUserId.toString()].includes(currentUser._id.toString());
    if (!isParticipant) return res.status(403).json({ message: 'Access denied' });
    await Connection.deleteOne({ _id: request._id });
    res.status(200).json({ removed: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/connect/report', async (req, res) => {
  try {
    const currentUser = await requireAuth(req, res);
    if (!currentUser) return;
    const { targetUserId, reason } = req.body;
    if (!targetUserId || !String(reason || '').trim()) {
      return res.status(400).json({ message: 'targetUserId and reason are required' });
    }
    const report = await Report.create({
      reporterId: currentUser._id,
      targetUserId,
      targetType: 'profile',
      reason: String(reason).trim(),
    });
    res.status(201).json({ report });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/connect/block/:userId', async (req, res) => {
  try {
    const currentUser = await requireAuth(req, res);
    if (!currentUser) return;
    if (!currentUser.blockedUserIds.some((id) => id.toString() === req.params.userId)) {
      currentUser.blockedUserIds.push(req.params.userId);
      await currentUser.save();
    }
    res.status(200).json({ blocked: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --- Real-Time Chat REST History (FR-CHAT-03) ---
// The chat UI generates a conversation key before any Conversation document
// necessarily exists yet: either a real Mongo ObjectId, `school-<schoolId>`
// (a conversation about a specific school), or `new-<userId>` (a fresh,
// not-yet-persisted conversation). This resolves any of those to a real
// Conversation, creating it on first use.
async function resolveConversation(rawId, currentUser) {
  if (mongoose.Types.ObjectId.isValid(rawId)) {
    const conversation = await Conversation.findById(rawId);
    if (conversation && conversation.userIds.some((id) => id.toString() === currentUser._id.toString())) {
      return conversation;
    }
    return null;
  }
  const schoolMatch = /^school-(.+)$/.exec(rawId);
  if (schoolMatch) {
    const schoolId = schoolMatch[1];
    // Contacting a school requires admin verification of that school.
    const chatSchool = mongoose.Types.ObjectId.isValid(schoolId) ? await School.findById(schoolId).select('verified verificationStatus') : null;
    if (!chatSchool || !chatSchool.verified) return null;
    let conversation = await Conversation.findOne({ userIds: currentUser._id, schoolId });
    if (!conversation) conversation = await Conversation.create({ userIds: [currentUser._id], schoolId });
    return conversation;
  }
  const newMatch = /^new-(.+)$/.exec(rawId);
  if (newMatch) {
    let conversation = await Conversation.findOne({ userIds: [currentUser._id], schoolId: null });
    if (!conversation) conversation = await Conversation.create({ userIds: [currentUser._id], schoolId: null });
    return conversation;
  }
  return null;
}

app.post('/api/messages', async (req, res) => {
  try {
    const currentUser = await requireAuth(req, res);
    if (!currentUser) return;
    const { conversationId, message } = req.body;
    const trimmed = String(message || '').trim();
    if (!conversationId || !trimmed) {
      return res.status(400).json({ message: 'conversationId and message are required' });
    }
    const conversation = await resolveConversation(conversationId, currentUser);
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });

    const savedMessage = await Message.create({
      conversationId: conversation._id,
      senderId: currentUser._id,
      senderName: currentUser.fullName,
      text: trimmed,
    });
    conversation.updatedAt = new Date();
    await conversation.save();
    io.to(conversation._id.toString()).emit('receive_message', savedMessage);

    res.status(201).json({ message: savedMessage, conversationId: conversation._id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/conversations', async (req, res) => {
  try {
    const currentUser = await requireAuth(req, res);
    if (!currentUser) return;
    const conversations = await Conversation.find({ userIds: currentUser._id })
      .populate('userIds schoolId')
      .sort({ updatedAt: -1 });
    res.status(200).json({ conversations });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/conversations', async (req, res) => {
  try {
    const currentUser = await requireAuth(req, res);
    if (!currentUser) return;
    const { userId, schoolId } = req.body;
    if (!userId) return res.status(400).json({ message: 'userId is required' });

    let conversation = await Conversation.findOne({
      userIds: { $all: [currentUser._id, userId], $size: 2 },
      schoolId: schoolId || null,
    });
    if (!conversation) {
      conversation = await Conversation.create({ userIds: [currentUser._id, userId], schoolId: schoolId || null });
    }
    res.status(201).json({ conversation });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/messages/:conversationId', async (req, res) => {
  try {
    const currentUser = await requireAuth(req, res);
    if (!currentUser) return;
    const conversation = await resolveConversation(req.params.conversationId, currentUser);
    if (!conversation) return res.status(200).json({ messages: [] });
    const messages = await Message.find({ conversationId: conversation._id }).sort({ timestamp: 1 });
    res.status(200).json({ messages, conversationId: conversation._id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --- Private verification files: only the school's own team and platform admins can open them ---
const PRIVATE_NAME = /^[A-Za-z0-9._-]{8,120}$/;
async function canReadPrivateFile(user, name) {
  if (isAdminRole(user.userType)) return true;
  const url = `/api/private-files/${name}`;
  const school = await School.findOne({ 'verificationDocs.url': url }).select('claimedBy');
  if (!school) return false;
  if (school.claimedBy && String(school.claimedBy) === String(user._id)) return true;
  return Boolean(await SchoolStaff.exists({ schoolId: school._id, $or: [{ userId: user._id }, { email: String(user.email || '').toLowerCase() }] }));
}
// Returns a link that works for 5 minutes, so the phone can open the file in its browser.
app.post('/api/private-files/link', async (req, res) => {
  try {
    const user = await requireAuth(req, res); if (!user) return;
    const name = path.basename(String(req.body?.url || ''));
    if (!PRIVATE_NAME.test(name) || !(await canReadPrivateFile(user, name))) return res.status(403).json({ message: 'Access denied' });
    const t = jwt.sign({ sub: String(user._id), file: name, purpose: 'private-file' }, JWT_SECRET, { expiresIn: '5m' });
    res.json({ path: `/api/private-files/${name}?t=${t}` });
  } catch (error) { res.status(500).json({ message: 'Could not create the link' }); }
});
app.get('/api/private-files/:name', async (req, res) => {
  try {
    const name = req.params.name;
    if (!PRIVATE_NAME.test(name)) return res.status(404).json({ message: 'Not found' });
    let user = await authenticatedUser(req);
    if (!user && req.query.t) {
      try {
        const payload = jwt.verify(String(req.query.t), JWT_SECRET);
        if (payload.purpose === 'private-file' && payload.file === name) user = await User.findById(payload.sub);
      } catch { /* fall through to 401 */ }
    }
    if (!user || user.active === false) return res.status(401).json({ message: 'Authentication required' });
    if (!(await canReadPrivateFile(user, name))) return res.status(403).json({ message: 'Access denied' });
    const full = path.join(PRIVATE_DIR, name);
    if (!full.startsWith(PRIVATE_DIR + path.sep) || !fs.existsSync(full)) return res.status(404).json({ message: 'Not found' });
    res.set({ 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' });
    res.sendFile(full);
  } catch (error) { res.status(500).json({ message: 'Could not open the file' }); }
});

// One-time migration: verification documents uploaded before this change were publicly readable under /uploads.
async function movePublicVerificationDocsToPrivate() {
  const schools = await School.find({ 'verificationDocs.url': /^\/uploads\// });
  let moved = 0;
  for (const school of schools) {
    for (const doc of school.verificationDocs) {
      if (!/^\/uploads\//.test(doc.url || '')) continue;
      const name = path.basename(doc.url);
      const from = path.join(UPLOAD_DIR, name); const to = path.join(PRIVATE_DIR, name);
      try { if (fs.existsSync(from)) { fs.renameSync(from, to); } doc.url = `/api/private-files/${name}`; moved += 1; } catch (e) { console.warn('Could not move', name, e.message); }
    }
    await school.save();
  }
  if (moved) console.log(`Moved ${moved} verification document(s) out of the public uploads folder.`);
}

// --- File & Document Upload (FR-UPLOAD-01 to 05) ---
// Storage currently defaults to local disk; swap `upload`'s multer storage
// engine for a cloud provider (e.g. Firebase Storage/S3) for production use
// without changing the route contract below.
app.post('/api/upload', async (req, res) => {
  // Authenticate BEFORE multer touches the disk, so anonymous requests can never write files.
  const currentUser = await requireAuth(req, res);
  if (!currentUser) return;
  const isPrivate = req.query.private === '1';
  (isPrivate ? uploadPrivate : upload).single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message });
    if (!req.file) return res.status(400).json({ message: 'No file provided' });
    const fileUrl = isPrivate ? `/api/private-files/${req.file.filename}` : `/uploads/${req.file.filename}`;
    res.status(201).json({
      url: fileUrl,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
    });
  });
});

// --- Mentorship marketplace (Preply-style): mentor profiles, availability, paid lesson bookings, reviews ---
const { generateSlots, isValidAvailability } = require('./mentorSlots');
// Share of each lesson price kept by the platform (set MENTOR_COMMISSION_PERCENT in backend/.env).
const MENTOR_COMMISSION_PERCENT = Math.min(40, Math.max(0, Number(process.env.MENTOR_COMMISSION_PERCENT ?? 15) || 0));
const SLOT_HOLD_MS = 15 * 60 * 1000; // an unpaid booking holds its slot for 15 minutes

const mentorProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  headline: { type: String, default: '', maxlength: 120 },
  bio: { type: String, default: '', maxlength: 2000 },
  subjects: { type: [String], default: [] },
  languages: { type: [String], default: [] },
  country: { type: String, default: '' },
  hourlyRate: { type: Number, required: true, min: 0, max: 1000 },
  trialRate: { type: Number, default: null, min: 0, max: 1000 }, // price of a 30-minute trial lesson
  currency: { type: String, default: 'USD', uppercase: true },
  experienceYears: { type: Number, default: 0, min: 0, max: 60 },
  education: { type: String, default: '', maxlength: 200 },
  availability: [{ day: Number, start: String, end: String, _id: false }],
  utcOffsetMinutes: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'paused'], default: 'active', index: true },
  ratingAvg: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  lessonsCompleted: { type: Number, default: 0 },
}, { timestamps: true });
const MentorProfile = mongoose.model('MentorProfile', mentorProfileSchema);

const mentorBookingSchema = new mongoose.Schema({
  mentorId: { type: mongoose.Schema.Types.ObjectId, ref: 'MentorProfile', required: true, index: true },
  mentorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  startAt: { type: Date, required: true, index: true },
  durationMin: { type: Number, enum: [30, 60], required: true },
  isTrial: { type: Boolean, default: false },
  price: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'USD', uppercase: true },
  platformFee: { type: Number, default: 0 },
  mentorNet: { type: Number, default: 0 },
  status: { type: String, enum: ['pending_payment', 'confirmed', 'completed', 'cancelled'], default: 'pending_payment', index: true },
  reference: { type: String, required: true, unique: true },
  transactionId: { type: String, default: '' },
  meetingUrl: { type: String, default: '' },
  note: { type: String, default: '', maxlength: 500 },
  cancelledBy: { type: String, enum: ['', 'student', 'mentor', 'system'], default: '' },
  refundDue: { type: Boolean, default: false },
}, { timestamps: true });
const MentorBooking = mongoose.model('MentorBooking', mentorBookingSchema);

const mentorReviewSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'MentorBooking', required: true, unique: true },
  mentorId: { type: mongoose.Schema.Types.ObjectId, ref: 'MentorProfile', required: true, index: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, default: '', maxlength: 1000 },
}, { timestamps: true });
const MentorReview = mongoose.model('MentorReview', mentorReviewSchema);

const mentorHandle = (fn) => async (req, res) => {
  try { await fn(req, res); } catch (error) {
    console.error('mentor route error:', req.method, req.path, error.message);
    if (!res.headersSent) res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
};
const mentorIdOk = (value) => mongoose.Types.ObjectId.isValid(String(value || '')) && String(value).length === 24;

const mentorList = (v) => (Array.isArray(v) ? v : String(v || '').split(',')).map((x) => String(x).trim()).filter(Boolean).slice(0, 15);
const round2 = (n) => Math.round(Number(n) * 100) / 100;
const trialPrice = (m) => (m.trialRate !== null && m.trialRate !== undefined ? m.trialRate : round2(m.hourlyRate / 2));

function serializeMentor(m, u) {
  const user = u || m.userId || {};
  return {
    id: String(m._id), userId: String(user._id || m.userId), name: user.fullName || 'Mentor', avatarUrl: user.avatarUrl || '',
    headline: m.headline, bio: m.bio, subjects: m.subjects, languages: m.languages, country: m.country || user.country || '',
    hourlyRate: m.hourlyRate, trialRate: trialPrice(m), currency: m.currency, experienceYears: m.experienceYears, education: m.education,
    ratingAvg: m.ratingAvg, reviewCount: m.reviewCount, lessonsCompleted: m.lessonsCompleted, status: m.status,
    availability: m.availability || [], utcOffsetMinutes: m.utcOffsetMinutes,
  };
}

async function busyIntervals(mentorId, from, to) {
  const holdCutoff = new Date(Date.now() - SLOT_HOLD_MS);
  const rows = await MentorBooking.find({
    mentorId, startAt: { $gte: new Date(from.getTime() - 3600 * 1000), $lte: to },
    $or: [{ status: 'confirmed' }, { status: 'pending_payment', createdAt: { $gt: holdCutoff } }],
  }).select('startAt durationMin').lean();
  return rows.map((r) => ({ start: r.startAt.getTime(), end: r.startAt.getTime() + r.durationMin * 60000 }));
}

async function refreshMentorRating(mentorId) {
  const agg = await MentorReview.aggregate([{ $match: { mentorId } }, { $group: { _id: null, avg: { $avg: '$rating' }, n: { $sum: 1 } } }]);
  await MentorProfile.updateOne({ _id: mentorId }, { ratingAvg: agg[0] ? round2(agg[0].avg) : 0, reviewCount: agg[0] ? agg[0].n : 0 });
}

app.get('/api/mentors', mentorHandle(async (req, res) => {
  const { q, subject, language, country, sort } = req.query;
  const filter = { status: 'active' };
  const minPrice = Number(req.query.minPrice); const maxPrice = Number(req.query.maxPrice);
  if (Number.isFinite(minPrice) || Number.isFinite(maxPrice)) {
    filter.hourlyRate = {};
    if (Number.isFinite(minPrice)) filter.hourlyRate.$gte = minPrice;
    if (Number.isFinite(maxPrice) && String(req.query.maxPrice) !== '') filter.hourlyRate.$lte = maxPrice;
  }
  if (Number(req.query.rating) > 0) filter.ratingAvg = { $gte: Number(req.query.rating) };
  if (subject) filter.subjects = new RegExp(escapeRegex(String(subject)), 'i');
  if (language) filter.languages = new RegExp(`^${escapeRegex(String(language))}$`, 'i');
  if (country) filter.country = new RegExp(escapeRegex(String(country)), 'i');
  if (q) {
    const rx = new RegExp(escapeRegex(String(q).trim()), 'i');
    const userIds = await User.find({ fullName: rx, active: { $ne: false } }).select('_id').limit(200).lean();
    filter.$or = [{ headline: rx }, { bio: rx }, { subjects: rx }, { userId: { $in: userIds.map((u) => u._id) } }];
  }
  const sorts = { price_asc: { hourlyRate: 1 }, price_desc: { hourlyRate: -1 }, rating: { ratingAvg: -1, reviewCount: -1 } };
  const order = sorts[sort] || { lessonsCompleted: -1, ratingAvg: -1, createdAt: -1 };
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.min(30, Math.max(1, parseInt(req.query.limit || '20', 10)));
  const [rows, total] = await Promise.all([
    MentorProfile.find(filter).sort(order).skip((page - 1) * limit).limit(limit).populate('userId', 'fullName avatarUrl country active'),
    MentorProfile.countDocuments(filter),
  ]);
  res.json({ mentors: rows.filter((m) => m.userId && m.userId.active !== false).map((m) => serializeMentor(m)), total, page, limit });
}));

app.get('/api/mentors/:id', mentorHandle(async (req, res) => {
  if (!mentorIdOk(req.params.id)) return res.status(404).json({ message: 'Mentor not found' });
  const m = await MentorProfile.findById(req.params.id).populate('userId', 'fullName avatarUrl country active');
  if (!m || !m.userId || m.userId.active === false) return res.status(404).json({ message: 'Mentor not found' });
  const reviews = await MentorReview.find({ mentorId: m._id }).sort({ createdAt: -1 }).limit(20).populate('studentId', 'fullName avatarUrl').lean();
  res.json({
    mentor: serializeMentor(m),
    reviews: reviews.map((r) => ({ id: String(r._id), rating: r.rating, comment: r.comment, createdAt: r.createdAt, studentName: r.studentId?.fullName || 'Student', studentAvatar: r.studentId?.avatarUrl || '' })),
  });
}));

app.get('/api/mentors/:id/slots', mentorHandle(async (req, res) => {
  if (!mentorIdOk(req.params.id)) return res.status(404).json({ message: 'Mentor not found' });
  const m = await MentorProfile.findById(req.params.id);
  if (!m || m.status !== 'active') return res.status(404).json({ message: 'Mentor not found' });
  const durationMin = Number(req.query.duration) === 30 ? 30 : 60;
  const from = new Date(); const to = new Date(from.getTime() + 16 * 86400000);
  const busy = await busyIntervals(m._id, from, to);
  const slots = generateSlots({ availability: m.availability, utcOffsetMinutes: m.utcOffsetMinutes, durationMin, from, days: 14, busy });
  res.json({ slots, durationMin });
}));

app.get('/api/me/mentor', mentorHandle(async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return;
  const m = await MentorProfile.findOne({ userId: user._id });
  res.json({ mentor: m ? serializeMentor(m, user) : null });
}));

app.put('/api/me/mentor', mentorHandle(async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return;
  if (isAdminRole(user.userType)) return res.status(403).json({ message: 'Admin accounts cannot be mentors' });
  const b = req.body || {};
  const hourlyRate = Number(b.hourlyRate);
  if (!Number.isFinite(hourlyRate) || hourlyRate < 0 || hourlyRate > 1000) return res.status(400).json({ message: 'Enter an hourly rate between 0 and 1000' });
  const subjects = mentorList(b.subjects);
  if (!subjects.length) return res.status(400).json({ message: 'Add at least one subject you can mentor in' });
  if (String(b.headline || '').trim().length < 5) return res.status(400).json({ message: 'Add a short headline (at least 5 characters)' });
  if (b.availability !== undefined && !isValidAvailability(b.availability)) return res.status(400).json({ message: 'Availability windows are invalid' });
  const update = {
    headline: String(b.headline || '').trim().slice(0, 120), bio: String(b.bio || '').trim().slice(0, 2000),
    subjects, languages: mentorList(b.languages), country: String(b.country || user.country || '').trim().slice(0, 60),
    hourlyRate: round2(hourlyRate),
    trialRate: b.trialRate === '' || b.trialRate === null || b.trialRate === undefined ? null : round2(Math.min(1000, Math.max(0, Number(b.trialRate) || 0))),
    experienceYears: Math.min(60, Math.max(0, Number(b.experienceYears) || 0)), education: String(b.education || '').trim().slice(0, 200),
    status: b.status === 'paused' ? 'paused' : 'active',
  };
  if (b.availability !== undefined) update.availability = b.availability.map((w) => ({ day: Number(w.day), start: String(w.start), end: String(w.end) }));
  if (Number.isFinite(Number(b.utcOffsetMinutes))) update.utcOffsetMinutes = Math.max(-720, Math.min(840, Number(b.utcOffsetMinutes)));
  const m = await MentorProfile.findOneAndUpdate({ userId: user._id }, { $set: update, $setOnInsert: { userId: user._id } }, { new: true, upsert: true, runValidators: true });
  res.json({ mentor: serializeMentor(m, user) });
}));

app.post('/api/mentors/:id/bookings', mentorHandle(async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return;
  if (!mentorIdOk(req.params.id)) return res.status(404).json({ message: 'Mentor not found' });
  const m = await MentorProfile.findById(req.params.id);
  if (!m || m.status !== 'active') return res.status(404).json({ message: 'This mentor is not accepting bookings' });
  if (String(m.userId) === String(user._id)) return res.status(400).json({ message: 'You cannot book your own lesson' });
  const isTrial = Boolean(req.body.isTrial);
  const durationMin = isTrial ? 30 : (Number(req.body.durationMin) === 30 ? 30 : 60);
  const startAt = new Date(req.body.startAt);
  if (Number.isNaN(startAt.getTime())) return res.status(400).json({ message: 'Choose a lesson time' });
  // The requested time must be one of the mentor's currently open slots (checks availability, notice time and conflicts).
  const busy = await busyIntervals(m._id, new Date(), new Date(Date.now() + 16 * 86400000));
  const open = generateSlots({ availability: m.availability, utcOffsetMinutes: m.utcOffsetMinutes, durationMin, from: new Date(), days: 14, busy });
  if (!open.includes(startAt.toISOString())) return res.status(409).json({ message: 'That time is no longer available. Please pick another slot.' });
  if (isTrial) {
    const usedTrial = await MentorBooking.exists({ mentorId: m._id, studentId: user._id, isTrial: true, status: { $in: ['confirmed', 'completed'] } });
    if (usedTrial) return res.status(409).json({ message: 'You have already used your trial lesson with this mentor.' });
  }
  const price = isTrial ? trialPrice(m) : round2((m.hourlyRate * durationMin) / 60);
  const platformFee = round2((price * MENTOR_COMMISSION_PERCENT) / 100);
  const booking = await MentorBooking.create({
    mentorId: m._id, mentorUserId: m.userId, studentId: user._id, startAt, durationMin, isTrial, price, currency: m.currency,
    platformFee, mentorNet: round2(price - platformFee), reference: `SCHULLOOP-LSN-${crypto.randomUUID()}`,
    note: String(req.body.note || '').trim().slice(0, 500),
    status: price === 0 ? 'confirmed' : 'pending_payment',
  });
  if (booking.status === 'confirmed') {
    booking.meetingUrl = `https://meet.jit.si/SchulLoop-${booking._id}`; await booking.save();
    await notifyUser(m.userId, 'booking', `${user.fullName} booked a lesson with you on ${startAt.toUTCString()}.`);
  }
  res.status(201).json({ booking, requiresPayment: booking.status === 'pending_payment' });
}));

app.post('/api/mentor-bookings/:id/checkout', mentorHandle(async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return;
  if (!mentorIdOk(req.params.id)) return res.status(404).json({ message: 'Booking not found' });
  const booking = await MentorBooking.findOne({ _id: req.params.id, studentId: user._id });
  if (!booking) return res.status(404).json({ message: 'Booking not found' });
  if (booking.status !== 'pending_payment') return res.status(400).json({ message: 'This booking does not need payment' });
  if (booking.createdAt.getTime() < Date.now() - SLOT_HOLD_MS) return res.status(410).json({ message: 'This booking expired. Please choose a time again.' });
  const secret = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!secret) return res.status(503).json({ message: 'Lesson payments are unavailable until FLUTTERWAVE_SECRET_KEY is configured on the server.' });
  const redirectUrl = String(req.body.redirectUrl || process.env.FLUTTERWAVE_REDIRECT_URL || '').trim();
  if (!redirectUrl) return res.status(503).json({ message: 'Configure FLUTTERWAVE_REDIRECT_URL in backend .env before starting checkout.' });
  const r = await fetch('https://api.flutterwave.com/v3/payments', {
    method: 'POST', headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ tx_ref: booking.reference, amount: booking.price, currency: booking.currency, redirect_url: redirectUrl,
      payment_options: 'card,mobilemoney', customer: { email: user.email, name: user.fullName, phonenumber: user.phone || '' },
      customizations: { title: 'SchulLoop Mentor Lesson', description: `${booking.durationMin}-minute lesson` } }),
  });
  const data = await r.json();
  if (!r.ok || data.status !== 'success' || !data.data?.link) return res.status(502).json({ message: data.message || 'Could not start secure checkout' });
  res.json({ checkoutUrl: data.data.link, booking });
}));

app.get('/api/mentor-bookings/verify/:transactionId', mentorHandle(async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return;
  const secret = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!secret) return res.status(503).json({ message: 'Flutterwave is not configured' });
  const r = await fetch(`https://api.flutterwave.com/v3/transactions/${encodeURIComponent(req.params.transactionId)}/verify`, { headers: { Authorization: `Bearer ${secret}` } });
  const data = await r.json();
  if (!r.ok || data.status !== 'success' || !data.data) return res.status(502).json({ message: data.message || 'Transaction verification failed' });
  const tx = data.data;
  const booking = await MentorBooking.findOne({ reference: tx.tx_ref, studentId: user._id });
  if (!booking) return res.status(404).json({ message: 'Booking not found for this account' });
  if (tx.status !== 'successful' || Number(tx.amount) < booking.price || String(tx.currency || '').toUpperCase() !== booking.currency) {
    return res.status(400).json({ verified: false, message: 'The payment does not match this lesson booking.' });
  }
  if (booking.status === 'pending_payment' || booking.status === 'cancelled') {
    // A late payment for a slot that has since been taken by someone else is flagged for refund rather than double-booked.
    const clash = await MentorBooking.exists({ _id: { $ne: booking._id }, mentorId: booking.mentorId, status: 'confirmed',
      startAt: { $lt: new Date(booking.startAt.getTime() + booking.durationMin * 60000), $gt: new Date(booking.startAt.getTime() - 60 * 60000) } });
    if (clash && booking.status === 'pending_payment') {
      booking.status = 'cancelled'; booking.cancelledBy = 'system'; booking.refundDue = true; booking.transactionId = String(tx.id || '');
      await booking.save();
      return res.status(409).json({ verified: false, message: 'Sorry, that time was taken while you were paying. Your payment will be refunded.' });
    }
    booking.status = 'confirmed'; booking.refundDue = false; booking.transactionId = String(tx.id || req.params.transactionId);
    booking.meetingUrl = booking.meetingUrl || `https://meet.jit.si/SchulLoop-${booking._id}`;
    await booking.save();
    await notifyUser(booking.mentorUserId, 'booking', `${user.fullName} booked and paid for a lesson on ${booking.startAt.toUTCString()}.`);
  }
  res.json({ verified: true, booking });
}));

app.get('/api/me/bookings', mentorHandle(async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return;
  const asMentor = req.query.role === 'mentor';
  const holdCutoff = new Date(Date.now() - SLOT_HOLD_MS);
  const filter = asMentor ? { mentorUserId: user._id } : { studentId: user._id };
  // Unpaid bookings older than the hold window are not shown.
  filter.$or = [{ status: { $ne: 'pending_payment' } }, { createdAt: { $gt: holdCutoff } }];
  const rows = await MentorBooking.find(filter).sort({ startAt: -1 }).limit(100)
    .populate('studentId', 'fullName avatarUrl').populate({ path: 'mentorId', populate: { path: 'userId', select: 'fullName avatarUrl' } }).lean();
  const reviewed = new Set((await MentorReview.find({ bookingId: { $in: rows.map((r) => r._id) } }).select('bookingId').lean()).map((r) => String(r.bookingId)));
  res.json({
    bookings: rows.map((b) => ({
      id: String(b._id), startAt: b.startAt, durationMin: b.durationMin, isTrial: b.isTrial, price: b.price, currency: b.currency, status: b.status,
      meetingUrl: b.status === 'confirmed' || b.status === 'completed' ? b.meetingUrl : '', note: b.note, refundDue: b.refundDue, reviewed: reviewed.has(String(b._id)),
      mentorProfileId: String(b.mentorId?._id || b.mentorId), mentorName: b.mentorId?.userId?.fullName || 'Mentor', mentorAvatar: b.mentorId?.userId?.avatarUrl || '',
      studentName: b.studentId?.fullName || 'Student', studentAvatar: b.studentId?.avatarUrl || '', mentorNet: asMentor ? b.mentorNet : undefined,
    })),
  });
}));

app.put('/api/mentor-bookings/:id/cancel', mentorHandle(async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return;
  if (!mentorIdOk(req.params.id)) return res.status(404).json({ message: 'Booking not found' });
  const b = await MentorBooking.findById(req.params.id);
  if (!b) return res.status(404).json({ message: 'Booking not found' });
  const isStudent = String(b.studentId) === String(user._id); const isMentor = String(b.mentorUserId) === String(user._id);
  if (!isStudent && !isMentor) return res.status(403).json({ message: 'Access denied' });
  if (!['pending_payment', 'confirmed'].includes(b.status)) return res.status(400).json({ message: 'This lesson can no longer be cancelled' });
  const hoursLeft = (b.startAt.getTime() - Date.now()) / 3600000;
  const paid = b.status === 'confirmed' && b.price > 0;
  // Mentor cancellations are always refunded; student cancellations are refunded when made 24+ hours ahead.
  b.refundDue = paid && (isMentor || hoursLeft >= 24);
  b.status = 'cancelled'; b.cancelledBy = isMentor ? 'mentor' : 'student';
  await b.save();
  await notifyUser(isMentor ? b.studentId : b.mentorUserId, 'booking', `${user.fullName} cancelled the lesson on ${b.startAt.toUTCString()}.`);
  res.json({ booking: b, message: b.refundDue ? 'Lesson cancelled. Your refund has been queued and will be processed by support.' : paid ? 'Lesson cancelled. It was inside the 24-hour window, so it is not refundable.' : 'Lesson cancelled.' });
}));

app.put('/api/mentor-bookings/:id/complete', mentorHandle(async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return;
  if (!mentorIdOk(req.params.id)) return res.status(404).json({ message: 'Booking not found' });
  const b = await MentorBooking.findOne({ _id: req.params.id, mentorUserId: user._id });
  if (!b) return res.status(404).json({ message: 'Booking not found' });
  if (b.status !== 'confirmed') return res.status(400).json({ message: 'Only confirmed lessons can be completed' });
  if (b.startAt.getTime() > Date.now()) return res.status(400).json({ message: 'You can mark a lesson complete once it has started' });
  b.status = 'completed'; await b.save();
  await MentorProfile.updateOne({ _id: b.mentorId }, { $inc: { lessonsCompleted: 1 } });
  await notifyUser(b.studentId, 'booking', 'Your lesson was marked complete. Leave a review for your mentor!');
  res.json({ booking: b });
}));

app.post('/api/mentor-bookings/:id/review', mentorHandle(async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return;
  if (!mentorIdOk(req.params.id)) return res.status(404).json({ message: 'Booking not found' });
  const b = await MentorBooking.findOne({ _id: req.params.id, studentId: user._id });
  if (!b) return res.status(404).json({ message: 'Booking not found' });
  if (b.status !== 'completed') return res.status(400).json({ message: 'You can review a lesson after it has been completed' });
  const rating = Number(req.body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ message: 'Choose a rating from 1 to 5' });
  if (await MentorReview.exists({ bookingId: b._id })) return res.status(409).json({ message: 'You already reviewed this lesson' });
  await MentorReview.create({ bookingId: b._id, mentorId: b.mentorId, studentId: user._id, rating, comment: String(req.body.comment || '').trim().slice(0, 1000) });
  await refreshMentorRating(b.mentorId);
  res.status(201).json({ reviewed: true });
}));

// --- Community events: students, mentors and schools host events; people RSVP ---
const communityEventSchema = new mongoose.Schema({
  hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, default: '', maxlength: 2000 },
  category: { type: String, default: 'General', maxlength: 40 },
  mode: { type: String, enum: ['online', 'in_person'], default: 'online' },
  location: { type: String, default: '', maxlength: 160 },
  link: { type: String, default: '', maxlength: 300 },
  startAt: { type: Date, required: true, index: true },
  endAt: { type: Date, default: null },
  capacity: { type: Number, default: 0, min: 0, max: 100000 }, // 0 = unlimited
  attendeeIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  status: { type: String, enum: ['active', 'cancelled'], default: 'active', index: true },
}, { timestamps: true });
const CommunityEvent = mongoose.model('CommunityEvent', communityEventSchema);

const eventHandle = (fn) => async (req, res) => {
  try { await fn(req, res); } catch (error) {
    console.error('event route error:', req.method, req.path, error.message);
    if (!res.headersSent) res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
};
const eventIdOk = (v) => mongoose.Types.ObjectId.isValid(String(v || '')) && String(v).length === 24;
const safeUrl = (v) => { const t = String(v || '').trim(); return /^https?:\/\//i.test(t) ? t.slice(0, 300) : ''; };

function serializeEvent(e, viewerId) {
  const host = e.hostId && e.hostId.fullName ? e.hostId : null;
  const ids = (e.attendeeIds || []).map(String);
  const going = viewerId ? ids.includes(String(viewerId)) : false;
  return {
    id: String(e._id), title: e.title, description: e.description, category: e.category, mode: e.mode, location: e.location,
    startAt: e.startAt, endAt: e.endAt, capacity: e.capacity, attendeeCount: ids.length, status: e.status,
    hostId: String(host ? host._id : e.hostId), hostName: host ? host.fullName : 'Host',
    isHost: viewerId ? String(host ? host._id : e.hostId) === String(viewerId) : false, going,
    full: e.capacity > 0 && ids.length >= e.capacity,
    // The join link is only revealed to people who RSVP'd (or the host).
    link: going || (viewerId && String(host ? host._id : e.hostId) === String(viewerId)) ? e.link : '',
    hasLink: Boolean(e.link),
  };
}
const optionalUser = (req) => authenticatedUser(req);

app.get('/api/events', eventHandle(async (req, res) => {
  const viewer = await optionalUser(req);
  const filter = { status: 'active', startAt: { $gte: new Date(Date.now() - 2 * 3600 * 1000) } };
  if (req.query.category && req.query.category !== 'All') filter.category = String(req.query.category);
  if (req.query.mode === 'online' || req.query.mode === 'in_person') filter.mode = req.query.mode;
  if (req.query.q) { const rx = new RegExp(escapeRegex(String(req.query.q).trim()), 'i'); filter.$or = [{ title: rx }, { description: rx }, { location: rx }]; }
  const rows = await CommunityEvent.find(filter).sort({ startAt: 1 }).limit(60).populate('hostId', 'fullName');
  res.json({ events: rows.map((e) => serializeEvent(e, viewer && viewer._id)) });
}));

app.get('/api/me/events', eventHandle(async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return;
  const hosting = req.query.role === 'hosting';
  const filter = hosting ? { hostId: user._id } : { attendeeIds: user._id, status: 'active' };
  const rows = await CommunityEvent.find(filter).sort({ startAt: -1 }).limit(100).populate('hostId', 'fullName');
  res.json({ events: rows.map((e) => serializeEvent(e, user._id)) });
}));

app.get('/api/events/:id', eventHandle(async (req, res) => {
  if (!eventIdOk(req.params.id)) return res.status(404).json({ message: 'Event not found' });
  const viewer = await optionalUser(req);
  const e = await CommunityEvent.findById(req.params.id).populate('hostId', 'fullName');
  if (!e) return res.status(404).json({ message: 'Event not found' });
  res.json({ event: serializeEvent(e, viewer && viewer._id) });
}));

function readEventBody(b) {
  const title = String(b.title || '').trim();
  if (title.length < 3) return { error: 'Add an event title (at least 3 characters)' };
  const startAt = new Date(b.startAt);
  if (Number.isNaN(startAt.getTime())) return { error: 'Choose a valid start date and time' };
  const endAt = b.endAt ? new Date(b.endAt) : null;
  if (endAt && (Number.isNaN(endAt.getTime()) || endAt <= startAt)) return { error: 'The end time must be after the start time' };
  const mode = b.mode === 'in_person' ? 'in_person' : 'online';
  if (mode === 'in_person' && !String(b.location || '').trim()) return { error: 'Add the place where the event will be held' };
  return { data: {
    title: title.slice(0, 120), description: String(b.description || '').trim().slice(0, 2000), category: String(b.category || 'General').trim().slice(0, 40) || 'General',
    mode, location: String(b.location || '').trim().slice(0, 160), link: safeUrl(b.link), startAt, endAt,
    capacity: Math.min(100000, Math.max(0, parseInt(b.capacity, 10) || 0)),
  } };
}

app.post('/api/events', eventHandle(async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return;
  const { data, error } = readEventBody(req.body || {});
  if (error) return res.status(400).json({ message: error });
  if (data.startAt.getTime() < Date.now() - 60000) return res.status(400).json({ message: 'The event must start in the future' });
  const recent = await CommunityEvent.countDocuments({ hostId: user._id, createdAt: { $gt: new Date(Date.now() - 24 * 3600 * 1000) } });
  if (recent >= 5) return res.status(429).json({ message: 'You can host up to 5 events per day.' });
  const e = await CommunityEvent.create({ ...data, hostId: user._id, attendeeIds: [] });
  await e.populate('hostId', 'fullName');
  res.status(201).json({ event: serializeEvent(e, user._id) });
}));

app.put('/api/events/:id', eventHandle(async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return;
  if (!eventIdOk(req.params.id)) return res.status(404).json({ message: 'Event not found' });
  const e = await CommunityEvent.findById(req.params.id);
  if (!e) return res.status(404).json({ message: 'Event not found' });
  if (String(e.hostId) !== String(user._id)) return res.status(403).json({ message: 'Only the host can edit this event' });
  const { data, error } = readEventBody(req.body || {});
  if (error) return res.status(400).json({ message: error });
  Object.assign(e, data); await e.save(); await e.populate('hostId', 'fullName');
  res.json({ event: serializeEvent(e, user._id) });
}));

// Host cancels (people who RSVP'd are notified); platform admins may also remove events.
app.delete('/api/events/:id', eventHandle(async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return;
  if (!eventIdOk(req.params.id)) return res.status(404).json({ message: 'Event not found' });
  const e = await CommunityEvent.findById(req.params.id);
  if (!e) return res.status(404).json({ message: 'Event not found' });
  if (String(e.hostId) !== String(user._id) && !isAdminRole(user.userType)) return res.status(403).json({ message: 'Access denied' });
  e.status = 'cancelled'; await e.save();
  await Promise.all(e.attendeeIds.map((id) => notifyUser(id, 'event', `The event "${e.title}" was cancelled by the host.`).catch(() => {})));
  res.json({ message: 'Event cancelled' });
}));

app.post('/api/events/:id/rsvp', eventHandle(async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return;
  if (!eventIdOk(req.params.id)) return res.status(404).json({ message: 'Event not found' });
  const e = await CommunityEvent.findById(req.params.id);
  if (!e || e.status !== 'active') return res.status(404).json({ message: 'Event not found' });
  if (e.startAt.getTime() < Date.now() - 2 * 3600 * 1000) return res.status(400).json({ message: 'This event has already happened' });
  // Atomic add so two people cannot take the last seat at once.
  const cond = { _id: e._id, attendeeIds: { $ne: user._id } };
  if (e.capacity > 0) cond[`attendeeIds.${e.capacity - 1}`] = { $exists: false };
  const r = await CommunityEvent.updateOne(cond, { $addToSet: { attendeeIds: user._id } });
  if (!r.modifiedCount) {
    const fresh = await CommunityEvent.findById(e._id);
    if (fresh.attendeeIds.map(String).includes(String(user._id))) return res.json({ going: true });
    return res.status(409).json({ message: 'Sorry, this event is full.' });
  }
  if (String(e.hostId) !== String(user._id)) await notifyUser(e.hostId, 'event', `${user.fullName} is going to "${e.title}".`).catch(() => {});
  res.json({ going: true });
}));

app.delete('/api/events/:id/rsvp', eventHandle(async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return;
  if (!eventIdOk(req.params.id)) return res.status(404).json({ message: 'Event not found' });
  await CommunityEvent.updateOne({ _id: req.params.id }, { $pull: { attendeeIds: user._id } });
  res.json({ going: false });
}));

// --- Payment Receipt Helpers ---
function nextReceiptNumber() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `SLP-${stamp}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

async function generatePaymentReceipt(paymentId) {
  const existing = await Receipt.findOne({ paymentId });
  if (existing) return existing;

  const payment = await Payment.findById(paymentId).populate('schoolId').populate('userId');
  if (!payment || payment.status !== 'completed') return null;

  const receiptNumber = nextReceiptNumber();
  const filename = `${receiptNumber}.pdf`;
  const pdfPath = path.join(RECEIPT_DIR, filename);
  const doc = new PDFDocument({ margin: 50 });
  const stream = fs.createWriteStream(pdfPath);
  doc.pipe(stream);
  doc.fontSize(22).text('SCHULLOOP', { align: 'center' });
  doc.fontSize(11).text('Smart Global Education & Student Platform', { align: 'center' });
  doc.moveDown();
  doc.fontSize(18).text('OFFICIAL PAYMENT RECEIPT', { align: 'center' });
  doc.moveDown();
  doc.fontSize(11);
  doc.text(`Receipt No: ${receiptNumber}`);
  doc.text(`Transaction Reference: ${payment.reference || 'N/A'}`);
  doc.text(`Date: ${new Date().toLocaleString()}`);
  doc.text(`Status: PAID`);
  doc.moveDown();
  doc.fontSize(14).text('Payer / Student');
  doc.fontSize(11).text(`Name: ${payment.userId?.fullName || 'N/A'}`);
  doc.text(`Email: ${payment.userId?.email || 'N/A'}`);
  doc.moveDown();
  doc.fontSize(14).text('School');
  doc.fontSize(11).text(`School: ${payment.schoolId?.name || 'N/A'}`);
  doc.text(`Location: ${payment.schoolId?.location || 'N/A'}`);
  doc.moveDown();
  doc.fontSize(14).text('Payment Details');
  doc.fontSize(11).text(`Description: School fee / registration payment`);
  doc.text(`Amount Paid: ${payment.amount.toLocaleString()} ${payment.schoolId?.currency || 'USD'}`);
  doc.text(`Payment Method: ${payment.method || 'N/A'}`);
  doc.moveDown();
  doc.text('This receipt was generated by SchulLoop after payment status was confirmed.');
  doc.moveDown();
  doc.fontSize(9).text('Keep this receipt for your records. Verify the transaction reference with the school or SchulLoop administrator if necessary.', { align: 'center' });
  doc.end();

  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  return Receipt.create({
    paymentId: payment._id,
    receiptNumber,
    userId: payment.userId._id,
    schoolId: payment.schoolId._id,
    amount: payment.amount,
    currency: payment.schoolId?.currency || 'USD',
    paymentMethod: payment.method || 'card',
    transactionReference: payment.reference,
    pdfPath,
  });
}

// --- Payments (FR-PAY-01 to 03) ---
app.post('/api/payments', async (req, res) => {
  try {
    const currentUser = await requireAuth(req, res);
    if (!currentUser) return;
    // The client field is `paymentMethod` (see PaymentScreen); `method` is
    // still accepted for any other caller that uses the shorter name.
    const { schoolId, amount, paymentMethod, method } = req.body;
    if (!schoolId || !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({ message: 'A valid schoolId and positive amount are required' });
    }
    const school = await School.findById(schoolId);
    if (!school) return res.status(404).json({ message: 'School not found' });
    if (!school.verified) return res.status(403).json({ message: 'Payments are available once the school is verified by an administrator' });

    // Card/mobile-money details entered on PaymentScreen are intentionally
    // NOT accepted or stored here — raw payment credentials should go
    // straight to the payment provider (Flutterwave), never through our
    // own API/DB. Only the resulting reference and status are tracked.
    const payment = await Payment.create({
      userId: currentUser._id,
      schoolId,
      amount: Number(amount),
      platformFee: Math.round(Number(amount) * PLATFORM_FEE_PERCENT) / 100,
      schoolNet: Math.round(Number(amount) * (100 - PLATFORM_FEE_PERCENT)) / 100,
      method: paymentMethod || method || 'card',
      status: 'pending',
      reference: crypto.randomUUID(),
    });
    // In production, the client uses `payment.reference` to initiate a
    // checkout with the payment provider; the provider's secret key is
    // used only here, server-side, to verify the transaction webhook.
    res.status(201).json({ payment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/payments', async (req, res) => {
  try {
    const currentUser = await requireAuth(req, res);
    if (!currentUser) return;
    const payments = await Payment.find({ userId: currentUser._id }).populate('schoolId').sort({ createdAt: -1 });
    res.status(200).json({ payments });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/payments/:id/status', async (req, res) => {
  try {
    const currentUser = await requireAuth(req, res);
    if (!currentUser) return;
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    if (payment.userId.toString() !== currentUser._id.toString() && !isAdminRole(currentUser.userType)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const { status } = req.body;
    if (!['pending', 'completed', 'failed', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    // Never allow a client or admin dashboard to manufacture a successful payment.
    // Only the verified Flutterwave transaction/webhook path may set completed and issue a receipt.
    if (status === 'completed') {
      return res.status(403).json({ message: 'A payment can only be marked completed after provider verification.' });
    }
    if (!isAdminRole(currentUser.userType) && status !== 'pending') {
      return res.status(403).json({ message: 'Payment status is controlled by the payment provider or administrator' });
    }
    payment.status = status;
    await payment.save();
    res.status(200).json({ payment, receipt: null });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --- Payment Receipts ---
app.get('/api/payments/:id/receipt', async (req, res) => {
  try {
    const currentUser = await requireAuth(req, res);
    if (!currentUser) return;
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    if (payment.userId.toString() !== currentUser._id.toString() && !isAdminRole(currentUser.userType)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (payment.status !== 'completed') return res.status(409).json({ message: 'Receipt is available only after payment is verified as completed' });
    const receipt = await generatePaymentReceipt(payment._id);
    if (!receipt || !fs.existsSync(receipt.pdfPath)) return res.status(500).json({ message: 'Receipt could not be generated' });
    res.download(receipt.pdfPath, `${receipt.receiptNumber}.pdf`);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/payments/:id/receipt-info', async (req, res) => {
  try {
    const currentUser = await requireAuth(req, res);
    if (!currentUser) return;
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    if (payment.userId.toString() !== currentUser._id.toString() && !isAdminRole(currentUser.userType)) return res.status(403).json({ message: 'Access denied' });
    if (payment.status !== 'completed') return res.status(409).json({ message: 'Receipt not available until payment is completed' });
    const receipt = await generatePaymentReceipt(payment._id);
    res.json({ receipt: { id: receipt._id, receiptNumber: receipt.receiptNumber, issuedAt: receipt.issuedAt, downloadPath: `/api/payments/${payment._id}/receipt` } });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// --- Push notification registration ---
app.post('/api/notifications/push-token', async(req,res)=>{try{const user=await requireAuth(req,res);if(!user)return;const {token,platform=''}=req.body;if(!token)return res.status(400).json({message:'Push token is required'});await PushToken.findOneAndUpdate({userId:user._id},{token,platform,updatedAt:new Date()},{upsert:true,new:true});res.json({registered:true});}catch(e){res.status(500).json({message:e.message});}});
// --- Career documents ---
app.get('/api/career/documents', async(req,res)=>{try{const user=await requireAuth(req,res);if(!user)return;res.json({documents:await CareerDocument.find({userId:user._id}).sort({createdAt:-1})});}catch(e){res.status(500).json({message:e.message});}});
app.post('/api/career/documents', async(req,res)=>{try{const user=await requireAuth(req,res);if(!user)return;const {title,category,url,mimeType,sizeBytes,visibility}=req.body;if(!title||!url)return res.status(400).json({message:'title and url are required'});const document=await CareerDocument.create({userId:user._id,title,category,url,mimeType,sizeBytes,visibility});res.status(201).json({document});}catch(e){res.status(500).json({message:e.message});}});
app.delete('/api/career/documents/:id', async(req,res)=>{try{const user=await requireAuth(req,res);if(!user)return;const document=await CareerDocument.findOneAndDelete({_id:req.params.id,userId:user._id});if(!document)return res.status(404).json({message:'Document not found'});res.json({deleted:true});}catch(e){res.status(500).json({message:e.message});}});
app.get('/api/users/:id/career-documents', async(req,res)=>{try{const user=await requireAuth(req,res);if(!user)return;const target=await User.findById(req.params.id);if(!target)return res.status(404).json({message:'User not found'});if(user._id.toString()!==target._id.toString()&&!['employer','admin','super_admin'].includes(user.userType))return res.status(403).json({message:'Access denied'});res.json({documents:await CareerDocument.find({userId:target._id,visibility:{$in:['employers','public']}}).sort({createdAt:-1})});}catch(e){res.status(500).json({message:e.message});}});
// --- Interviews ---
app.post('/api/employer/interviews', async(req,res)=>{try{const employer=await requireAuth(req,res);if(!employer)return;if(!['employer','admin','super_admin'].includes(employer.userType))return res.status(403).json({message:'Employer access required'});const {applicationId,scheduledAt,durationMinutes,mode,meetingUrl,notes}=req.body;const application=await Application.findById(applicationId).populate('jobId');if(!application)return res.status(404).json({message:'Application not found'});if(application.jobId.employerId&&application.jobId.employerId.toString()!==employer._id.toString()&&!isAdminRole(employer.userType))return res.status(403).json({message:'Not your application'});const interview=await Interview.create({applicationId,employerId:employer._id,candidateId:application.userId,scheduledAt,durationMinutes,mode,meetingUrl,notes});await notifyUser(application.userId,'interview',`Interview scheduled for ${new Date(scheduledAt).toLocaleString()}.`);res.status(201).json({interview});}catch(e){res.status(500).json({message:e.message});}});
app.get('/api/interviews', async(req,res)=>{try{const user=await requireAuth(req,res);if(!user)return;const q=user.userType==='employer'?{employerId:user._id}:{candidateId:user._id};res.json({interviews:await Interview.find(q).populate('applicationId employerId candidateId').sort({scheduledAt:1})});}catch(e){res.status(500).json({message:e.message});}});
app.put('/api/interviews/:id', async(req,res)=>{try{const user=await requireAuth(req,res);if(!user)return;const interview=await Interview.findById(req.params.id);if(!interview)return res.status(404).json({message:'Interview not found'});if(![interview.employerId.toString(),interview.candidateId.toString()].includes(user._id.toString())&&!isAdminRole(user.userType))return res.status(403).json({message:'Access denied'});Object.assign(interview,req.body);await interview.save();res.json({interview});}catch(e){res.status(500).json({message:e.message});}});
// --- Flutterwave checkout and verification ---
app.post('/api/payments/:id/checkout', async(req,res)=>{try{const user=await requireAuth(req,res);if(!user)return;const payment=await Payment.findOne({_id:req.params.id,userId:user._id}).populate('schoolId');if(!payment)return res.status(404).json({message:'Payment not found'});const secret=process.env.FLUTTERWAVE_SECRET_KEY;if(!secret)return res.status(503).json({message:'Flutterwave is not configured. Add FLUTTERWAVE_SECRET_KEY to backend .env'});const redirectUrl=String(req.body.redirectUrl||process.env.FLUTTERWAVE_REDIRECT_URL||'').trim();if(!redirectUrl)return res.status(503).json({message:'Configure FLUTTERWAVE_REDIRECT_URL or provide redirectUrl before checkout.'});const payload={tx_ref:payment.reference,amount:payment.amount,currency:String(payment.schoolId?.currency||'USD').toUpperCase(),redirect_url:redirectUrl,payment_options:req.body.paymentOptions||'card,mobilemoney',customer:{email:user.email,name:user.fullName,phonenumber:user.phone||''},customizations:{title:'SchulLoop School Payment',description:'School fee / registration payment'}};const r=await fetch('https://api.flutterwave.com/v3/payments',{method:'POST',headers:{Authorization:`Bearer ${secret}`,'Content-Type':'application/json'},body:JSON.stringify(payload)});const data=await r.json();if(!r.ok||data.status!=='success')return res.status(502).json({message:data.message||'Flutterwave checkout failed',provider:data});res.json({payment,checkoutUrl:data.data?.link});}catch(e){res.status(500).json({message:e.message});}});
app.get('/api/payments/verify/:transactionId', async(req,res)=>{try{const user=await requireAuth(req,res);if(!user)return;const secret=process.env.FLUTTERWAVE_SECRET_KEY;if(!secret)return res.status(503).json({message:'Flutterwave is not configured'});const r=await fetch(`https://api.flutterwave.com/v3/transactions/${encodeURIComponent(req.params.transactionId)}/verify`,{headers:{Authorization:`Bearer ${secret}`}});const data=await r.json();if(!r.ok||data.status!=='success')return res.status(502).json({message:data.message||'Verification failed'});const tx=data.data;const payment=await Payment.findOne({reference:tx.tx_ref}).populate('schoolId');if(!payment)return res.status(404).json({message:'Payment record not found'});if(payment.userId.toString()!==user._id.toString()&&!isAdminRole(user.userType))return res.status(403).json({message:'Access denied'});if(tx.status==='successful'&&String(tx.tx_ref)===String(payment.reference)&&Number(tx.amount)>=Number(payment.amount)&&String(tx.currency||'').toUpperCase()===String(payment.schoolId?.currency||'USD').toUpperCase()){payment.status='completed';await payment.save();const receipt=await generatePaymentReceipt(payment._id);res.json({verified:true,payment,receipt:receipt?{id:receipt._id,receiptNumber:receipt.receiptNumber}:null});}else{payment.status='failed';await payment.save();res.json({verified:false,payment});}}catch(e){res.status(500).json({message:e.message});}});
app.post('/api/payments/flutterwave/webhook', async(req,res)=>{try{const secret=process.env.FLUTTERWAVE_WEBHOOK_SECRET||'';if(!secret||req.headers['verif-hash']!==secret)return res.status(401).send('Unauthorized');const tx=req.body?.data;if(tx?.tx_ref&&tx?.status==='successful'){
  const payment=await Payment.findOne({reference:tx.tx_ref}).populate('schoolId');
  if(payment&&String(tx.tx_ref)===String(payment.reference)&&Number(tx.amount)>=Number(payment.amount)&&String(tx.currency||'').toUpperCase()===String(payment.schoolId?.currency||'USD').toUpperCase()){
    if(payment.status!=='completed'){payment.status='completed';await payment.save();await generatePaymentReceipt(payment._id);await notifyUser(payment.userId,'payment',`Payment ${payment.reference} has been confirmed.`);}
  } else {
    const subscription=await Subscription.findOne({reference:tx.tx_ref});
    if(subscription&&Number(tx.amount)>=Number(subscription.amount)&&String(tx.currency||'').toUpperCase()===subscription.currency&&subscription.status==='pending'){
      const now=new Date();const currentActive=await Subscription.findOne({userId:subscription.userId,status:'active',endsAt:{$gt:now}}).sort({endsAt:-1});
      subscription.startsAt=currentActive&&currentActive.endsAt>now?currentActive.endsAt:now;subscription.endsAt=new Date(subscription.startsAt.getTime()+30*24*60*60*1000);subscription.status='active';subscription.transactionId=String(tx.id||'');await subscription.save();
      await notifyUser(subscription.userId,'subscription',`${subscription.planName} is now active until ${subscription.endsAt.toLocaleDateString()}. Renewal is manual.`);
    }
  }
}res.sendStatus(200);}catch(e){console.error('Flutterwave webhook processing failed:',e.message);res.sendStatus(500);}});


// --- Notifications (FR-NOTIF-01 to 04) ---
app.get('/api/notifications', async (req, res) => {
  try {
    const currentUser = await requireAuth(req, res);
    if (!currentUser) return;
    const notifications = await Notification.find({ userId: currentUser._id }).sort({ createdAt: -1 });
    res.status(200).json({ notifications });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/notifications/:id/read', async (req, res) => {
  try {
    const currentUser = await requireAuth(req, res);
    if (!currentUser) return;
    const notification = await Notification.findOne({ _id: req.params.id, userId: currentUser._id });
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    notification.read = true;
    await notification.save();
    res.status(200).json({ notification });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --- Administration (FR-ADMIN-01 to 05) ---
app.get('/api/admin/schools', async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const status = req.query.status; // 'pending' | 'verified' | undefined (all)
    const filter = status === 'pending' ? { verified: false } : status === 'verified' ? { verified: true } : {};
    if (req.query.source === 'imported' || req.query.source === 'schulloop') filter.source = req.query.source;
    if (['unverified', 'claimed', 'verified'].includes(req.query.verificationStatus)) filter.verificationStatus = req.query.verificationStatus;
    // Lets an admin find and verify ANY school by name/city/country, including bulk-imported ones
    // that are deliberately left out of the plain "pending" list above (there can be thousands).
    if (req.query.q) {
      const pattern = new RegExp(escapeRegex(req.query.q), 'i');
      filter.$or = [{ name: pattern }, { city: pattern }, { country: pattern }];
    }
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '50', 10)));
    const schools = await School.find(filter).sort({ _id: -1 }).skip((page - 1) * limit).limit(limit);
    const total = await School.countDocuments(filter);
    res.status(200).json({ schools, page, limit, total });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/admin/schools/:id/verification-docs', async (req, res) => {
  try {
    const admin = await requireAdmin(req, res); if (!admin) return;
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ message: 'School not found' });
    const school = await School.findById(req.params.id).select('name verificationDocs verificationSubmittedAt');
    if (!school) return res.status(404).json({ message: 'School not found' });
    res.json({ name: school.name, submittedAt: school.verificationSubmittedAt, docs: school.verificationDocs || [] });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.put('/api/admin/schools/:id/verify', async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const school = await School.findById(req.params.id);
    if (!school) return res.status(404).json({ message: 'School not found' });
    const wasVerified = school.verified;
    school.verificationStatus = 'verified';
    await school.save();
    if (!wasVerified) {
      const watchers = await Favorite.find({ schoolId: school._id }).select('userId');
      for (const w of watchers) await notifyUser(w.userId, 'school_verified', `${school.name} is now verified. Its full profile is available.`);
      if (school.claimedBy) await notifyUser(school.claimedBy, 'school_verified', `${school.name} has been verified.`);
    }
    res.status(200).json({ school });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/admin/schools/:id/reject', async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const school = await School.findById(req.params.id);
    if (!school) return res.status(404).json({ message: 'School not found' });
    const reason = String(req.body.reason || '').trim();
    if (!reason) return res.status(400).json({ message: 'A rejection reason is required' });
    school.verificationStatus = school.claimedBy ? 'claimed' : 'unverified';
    await school.save();
    const rejection = await Rejection.create({ schoolId: school._id, reason, adminId: admin._id });
    res.status(200).json({ school, rejection });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --- School claims (representatives take ownership of imported listings) ---
app.post('/api/schools/:id/claim', async (req, res) => {
  try {
    const currentUser = await requireAuth(req, res);
    if (!currentUser) return;
    const school = await School.findById(req.params.id);
    if (!school) return res.status(404).json({ message: 'School not found' });
    if (school.claimedBy) return res.status(409).json({ message: 'This school has already been claimed' });
    const evidence = String(req.body.evidence || '').trim();
    if (evidence.length < 10) return res.status(400).json({ message: 'Please explain how you are connected to this school (role, official email or website)' });
    const existing = await SchoolClaim.findOne({ schoolId: school._id, userId: currentUser._id, status: 'pending' });
    if (existing) return res.status(409).json({ message: 'You already have a pending claim for this school' });
    const claim = await SchoolClaim.create({
      schoolId: school._id, userId: currentUser._id, evidence,
      contactName: String(req.body.contactName || currentUser.fullName).trim(),
      contactEmail: String(req.body.contactEmail || currentUser.email).trim(),
      contactPhone: String(req.body.contactPhone || currentUser.phone || '').trim(),
    });
    res.status(201).json({ message: 'Claim submitted for review', claim });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// ===== School administrator portal =====================================================
// Every endpoint derives the school from the signed-in user (owner via School.claimedBy, or an
// active staff membership). A client-supplied school id is never trusted.
const schoolAnnouncementSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, maxlength: 160 },
  category: { type: String, default: 'News' },
  body: { type: String, required: true, maxlength: 4000 },
  publishDate: { type: Date, default: Date.now },
  status: { type: String, default: 'published' },
}, { timestamps: true });
const SchoolAnnouncement = mongoose.model('SchoolAnnouncement', schoolAnnouncementSchema);

const schoolEnquirySchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subject: { type: String, required: true, maxlength: 160 },
  message: { type: String, required: true, maxlength: 3000 },
  status: { type: String, enum: ['unread', 'read', 'replied'], default: 'unread' },
  reply: { type: String, default: '' },
  repliedAt: { type: Date, default: null },
}, { timestamps: true });
const SchoolEnquiry = mongoose.model('SchoolEnquiry', schoolEnquirySchema);

const SCHOOL_ROLES = {
  owner: ['profile', 'gallery', 'academics', 'admissions', 'enquiries', 'announcements', 'verification', 'staff', 'analytics', 'settings'],
  school_admin: ['profile', 'gallery', 'academics', 'admissions', 'enquiries', 'announcements', 'analytics', 'settings'],
  admissions_officer: ['admissions', 'enquiries'],
  communications_officer: ['gallery', 'announcements'],
};
const schoolStaffSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  email: { type: String, required: true, lowercase: true, trim: true },
  role: { type: String, enum: ['school_admin', 'admissions_officer', 'communications_officer'], required: true },
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
schoolStaffSchema.index({ schoolId: 1, email: 1 }, { unique: true });
const SchoolStaff = mongoose.model('SchoolStaff', schoolStaffSchema);

const schoolEventSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  type: { type: String, enum: ['view', 'contact'], required: true },
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 120 },
});
schoolEventSchema.index({ schoolId: 1, type: 1, createdAt: -1 });
const SchoolEvent = mongoose.model('SchoolEvent', schoolEventSchema);

// Resolves the school this user may manage and checks the permission for this action.
async function requireSchoolAccess(req, res, permission) {
  const user = await requireAuth(req, res);
  if (!user) return null;
  let school = await School.findOne({ claimedBy: user._id });
  let role = school ? 'owner' : null;
  if (!school) {
    const membership = await SchoolStaff.findOne({ $or: [{ userId: user._id }, { email: String(user.email || '').toLowerCase() }] });
    if (membership) {
      school = await School.findById(membership.schoolId);
      role = membership.role;
      if (school && !membership.userId) { membership.userId = user._id; await membership.save(); }
    }
  }
  if (!school) { res.status(403).json({ message: 'No school is linked to this account. Claim your school first.' }); return null; }
  const permissions = SCHOOL_ROLES[role] || [];
  if (permission && !permissions.includes(permission)) { res.status(403).json({ message: 'Your role does not allow this action' }); return null; }
  return { user, school, role, permissions };
}

const pick = (obj, keys) => keys.reduce((acc, k) => (obj[k] === undefined ? acc : { ...acc, [k]: obj[k] }), {});
const str = (v, max = 500) => String(v == null ? '' : v).trim().slice(0, max);
const strList = (v) => (Array.isArray(v) ? v : []).map((x) => str(x, 120)).filter(Boolean).slice(0, 60);
const isSafeUrl = (u) => /^(https?:\/\/|\/uploads\/|\/api\/private-files\/)/i.test(String(u || ''));

function profileCompletion(s) {
  const checks = [s.name, s.description, s.type && s.type !== 'Other', s.country, s.city, s.phone || s.email, s.logoUrl, s.coverUrl || s.imageUrl,
    (s.gallery || []).length > 0, (s.levels || []).length > 0, (s.programList || []).length > 0 || (s.programs || []).length > 0,
    (s.facilities || []).length > 0, s.admissionStatus, s.requirementsText || (s.admissionRequirements || []).length > 0, s.latitude != null && s.longitude != null];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

app.get('/api/school-admin/me', async (req, res) => {
  try {
    const ctx = await requireSchoolAccess(req, res); if (!ctx) return;
    const school = ctx.school.toObject();
    const out = { ...school, completion: profileCompletion(school) };
    if (ctx.role !== 'owner') delete out.verificationDocs;
    res.json({ school: out, role: ctx.role, permissions: ctx.permissions, user: { fullName: ctx.user.fullName, email: ctx.user.email, phone: ctx.user.phone || '' } });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.put('/api/school-admin/profile', async (req, res) => {
  try {
    const ctx = await requireSchoolAccess(req, res, 'profile'); if (!ctx) return;
    const b = req.body || {};
    const next = {
      name: str(b.name, 160), type: str(b.type, 60), ownership: str(b.ownership, 60), founded: Number(b.founded) || undefined,
      motto: str(b.motto, 160), description: str(b.description, 4000), country: str(b.country, 80), region: str(b.region, 80),
      city: str(b.city, 80), neighbourhood: str(b.neighbourhood, 80), address: str(b.address, 300), phone: str(b.phone, 40),
      email: str(b.email, 120), website: str(b.website, 200), whatsapp: str(b.whatsapp, 40), admissionsContactName: str(b.admissionsContactName, 120),
      admissionsContactRole: str(b.admissionsContactRole, 120),
    };
    if (!next.name) return res.status(400).json({ message: 'School name is required' });
    if (ctx.school.verificationStatus === 'verified' && next.name !== ctx.school.name) {
      return res.status(409).json({ message: 'Name changes on a verified school need SchulLoop review. Contact support.' });
    }
    Object.entries(next).forEach(([k, v]) => { if (v !== undefined && v !== '') ctx.school[k] = v; else if (typeof v === 'string') ctx.school[k] = ''; });
    ['latitude', 'longitude'].forEach((k) => { if (b[k] !== undefined && b[k] !== '' && Number.isFinite(Number(b[k]))) ctx.school[k] = Number(b[k]); });
    ctx.school.location = [ctx.school.city, ctx.school.region, ctx.school.country].filter(Boolean).join(', ');
    ctx.school.profileStatus = b.submit ? 'submitted' : 'draft';
    await ctx.school.save();
    res.json({ message: b.submit ? 'Profile submitted for review' : 'Draft saved', school: ctx.school });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.put('/api/school-admin/academics', async (req, res) => {
  try {
    const ctx = await requireSchoolAccess(req, res, 'academics'); if (!ctx) return;
    const b = req.body || {};
    ctx.school.levels = strList(b.levels);
    ctx.school.language = str(b.language, 60);
    ctx.school.schoolMode = str(b.schoolMode, 60);
    ctx.school.facilities = strList(b.facilities);
    ctx.school.programList = (Array.isArray(b.programList) ? b.programList : []).slice(0, 60)
      .map((p) => ({ name: str(p.name, 120), level: str(p.level, 60), status: 'published' })).filter((p) => p.name);
    ctx.school.programs = ctx.school.programList.map((p) => p.name);
    await ctx.school.save();
    res.json({ message: 'Academic information saved', school: ctx.school });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.put('/api/school-admin/admissions', async (req, res) => {
  try {
    const ctx = await requireSchoolAccess(req, res, 'admissions'); if (!ctx) return;
    const b = req.body || {};
    Object.assign(ctx.school, {
      admissionStatus: str(b.admissionStatus, 60), academicYear: str(b.academicYear, 40), admissionOpens: str(b.admissionOpens, 30),
      admissionCloses: str(b.admissionCloses, 30), requirementsText: str(b.requirementsText, 3000), requiredDocuments: str(b.requiredDocuments, 2000),
      applicationMethod: str(b.applicationMethod, 60), applicationFee: str(b.applicationFee, 60),
    });
    ctx.school.admissionRequirements = ctx.school.requirementsText ? ctx.school.requirementsText.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 40) : [];
    await ctx.school.save();
    res.json({ message: 'Admission settings saved', school: ctx.school });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.put('/api/school-admin/images', async (req, res) => {
  try {
    const ctx = await requireSchoolAccess(req, res, 'gallery'); if (!ctx) return;
    const { logoUrl, coverUrl } = req.body || {};
    if (logoUrl !== undefined) { if (logoUrl && !isSafeUrl(logoUrl)) return res.status(400).json({ message: 'Invalid logo URL' }); ctx.school.logoUrl = logoUrl || ''; }
    if (coverUrl !== undefined) { if (coverUrl && !isSafeUrl(coverUrl)) return res.status(400).json({ message: 'Invalid cover URL' }); ctx.school.coverUrl = coverUrl || ''; ctx.school.imageUrl = coverUrl || ctx.school.imageUrl; }
    await ctx.school.save();
    res.json({ school: ctx.school });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.post('/api/school-admin/gallery', async (req, res) => {
  try {
    const ctx = await requireSchoolAccess(req, res, 'gallery'); if (!ctx) return;
    const url = str(req.body?.url, 500);
    if (!isSafeUrl(url)) return res.status(400).json({ message: 'Upload the image first, then add it to the gallery' });
    if (ctx.school.gallery.length >= 60) return res.status(400).json({ message: 'Gallery limit reached (60 photos)' });
    ctx.school.gallery.push({ url, caption: str(req.body?.caption, 120) });
    await ctx.school.save();
    res.status(201).json({ gallery: ctx.school.gallery });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.delete('/api/school-admin/gallery/:itemId', async (req, res) => {
  try {
    const ctx = await requireSchoolAccess(req, res, 'gallery'); if (!ctx) return;
    ctx.school.gallery = ctx.school.gallery.filter((g) => String(g._id) !== req.params.itemId);
    await ctx.school.save();
    res.json({ gallery: ctx.school.gallery });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.get('/api/school-admin/announcements', async (req, res) => {
  try {
    const ctx = await requireSchoolAccess(req, res, 'announcements'); if (!ctx) return;
    res.json({ announcements: await SchoolAnnouncement.find({ schoolId: ctx.school._id }).sort({ createdAt: -1 }).limit(50) });
  } catch (error) { res.status(500).json({ message: error.message }); }
});
app.post('/api/school-admin/announcements', async (req, res) => {
  try {
    const ctx = await requireSchoolAccess(req, res, 'announcements'); if (!ctx) return;
    const title = str(req.body?.title, 160); const body = str(req.body?.body, 4000);
    if (!title || !body) return res.status(400).json({ message: 'Add a title and message first' });
    const date = req.body?.publishDate ? new Date(req.body.publishDate) : new Date();
    const post = await SchoolAnnouncement.create({ schoolId: ctx.school._id, authorId: ctx.user._id, title, body, category: str(req.body?.category, 40) || 'News', publishDate: Number.isNaN(date.getTime()) ? new Date() : date });
    res.status(201).json({ announcement: post });
  } catch (error) { res.status(500).json({ message: error.message }); }
});
app.delete('/api/school-admin/announcements/:id', async (req, res) => {
  try {
    const ctx = await requireSchoolAccess(req, res, 'announcements'); if (!ctx) return;
    await SchoolAnnouncement.deleteOne({ _id: req.params.id, schoolId: ctx.school._id });
    res.json({ message: 'Deleted' });
  } catch (error) { res.status(500).json({ message: error.message }); }
});
app.get('/api/schools/:id/announcements', async (req, res) => {
  try {
    const posts = await SchoolAnnouncement.find({ schoolId: req.params.id, status: 'published', publishDate: { $lte: new Date() } }).sort({ publishDate: -1 }).limit(20).select('title category body publishDate');
    res.json({ announcements: posts });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.post('/api/schools/:id/enquiries', async (req, res) => {
  try {
    const user = await requireAuth(req, res); if (!user) return;
    const school = await School.findById(req.params.id).select('_id');
    if (!school) return res.status(404).json({ message: 'School not found' });
    const subject = str(req.body?.subject, 160); const message = str(req.body?.message, 3000);
    if (!subject || message.length < 5) return res.status(400).json({ message: 'Add a subject and a message' });
    const enquiry = await SchoolEnquiry.create({ schoolId: school._id, userId: user._id, subject, message });
    res.status(201).json({ enquiry });
  } catch (error) { res.status(500).json({ message: error.message }); }
});
app.get('/api/school-admin/enquiries', async (req, res) => {
  try {
    const ctx = await requireSchoolAccess(req, res, 'enquiries'); if (!ctx) return;
    const list = await SchoolEnquiry.find({ schoolId: ctx.school._id }).sort({ createdAt: -1 }).limit(100).populate('userId', 'fullName userType');
    res.json({ enquiries: list });
  } catch (error) { res.status(500).json({ message: error.message }); }
});
app.put('/api/school-admin/enquiries/:id', async (req, res) => {
  try {
    const ctx = await requireSchoolAccess(req, res, 'enquiries'); if (!ctx) return;
    const enquiry = await SchoolEnquiry.findOne({ _id: req.params.id, schoolId: ctx.school._id });
    if (!enquiry) return res.status(404).json({ message: 'Enquiry not found' });
    const reply = str(req.body?.reply, 3000);
    if (reply) { enquiry.reply = reply; enquiry.repliedAt = new Date(); enquiry.status = 'replied'; await notifyUser(enquiry.userId, 'school_enquiry', `${ctx.school.name} replied to your enquiry: ${enquiry.subject}`); }
    else if (['read', 'unread'].includes(req.body?.status)) enquiry.status = req.body.status;
    await enquiry.save();
    res.json({ enquiry });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.post('/api/school-admin/verification-documents', async (req, res) => {
  try {
    const ctx = await requireSchoolAccess(req, res, 'verification'); if (!ctx) return;
    const url = str(req.body?.url, 500);
    if (!isSafeUrl(url)) return res.status(400).json({ message: 'Upload the document first' });
    ctx.school.verificationDocs.push({ kind: str(req.body?.kind, 60) || 'document', name: str(req.body?.name, 160), url });
    await ctx.school.save();
    res.status(201).json({ verificationDocs: ctx.school.verificationDocs });
  } catch (error) { res.status(500).json({ message: error.message }); }
});
app.post('/api/school-admin/verification/submit', async (req, res) => {
  try {
    const ctx = await requireSchoolAccess(req, res, 'verification'); if (!ctx) return;
    if (!ctx.school.verificationDocs.length) return res.status(400).json({ message: 'Upload at least one verification document first' });
    ctx.school.verificationSubmittedAt = new Date();
    await ctx.school.save();
    res.json({ verificationSubmittedAt: ctx.school.verificationSubmittedAt });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.get('/api/school-admin/staff', async (req, res) => {
  try {
    const ctx = await requireSchoolAccess(req, res, 'staff'); if (!ctx) return;
    const owner = await User.findById(ctx.school.claimedBy).select('fullName email');
    const staff = await SchoolStaff.find({ schoolId: ctx.school._id }).sort({ createdAt: 1 });
    res.json({ owner, staff });
  } catch (error) { res.status(500).json({ message: error.message }); }
});
app.post('/api/school-admin/staff', async (req, res) => {
  try {
    const ctx = await requireSchoolAccess(req, res, 'staff'); if (!ctx) return;
    const email = str(req.body?.email, 120).toLowerCase(); const role = str(req.body?.role, 40);
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: 'Enter a valid email address' });
    if (!['school_admin', 'admissions_officer', 'communications_officer'].includes(role)) return res.status(400).json({ message: 'Choose a staff role' });
    if (email === String(ctx.user.email).toLowerCase()) return res.status(400).json({ message: 'You already own this school' });
    const existingUser = await User.findOne({ email }).select('_id');
    const member = await SchoolStaff.findOneAndUpdate({ schoolId: ctx.school._id, email }, { $set: { role, userId: existingUser ? existingUser._id : null, invitedBy: ctx.user._id } }, { upsert: true, new: true, setDefaultsOnInsert: true });
    res.status(201).json({ member });
  } catch (error) { res.status(500).json({ message: error.message }); }
});
app.delete('/api/school-admin/staff/:id', async (req, res) => {
  try {
    const ctx = await requireSchoolAccess(req, res, 'staff'); if (!ctx) return;
    await SchoolStaff.deleteOne({ _id: req.params.id, schoolId: ctx.school._id });
    res.json({ message: 'Access removed' });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.post('/api/schools/:id/events', async (req, res) => {
  try {
    if (req.body?.type !== 'contact') return res.status(400).json({ message: 'Unsupported event' });
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ message: 'School not found' });
    const exists = await School.exists({ _id: req.params.id });
    if (!exists) return res.status(404).json({ message: 'School not found' });
    await SchoolEvent.create({ schoolId: req.params.id, type: 'contact' });
    res.status(201).json({ ok: true });
  } catch (error) { res.status(500).json({ message: error.message }); }
});
app.get('/api/school-admin/analytics', async (req, res) => {
  try {
    const ctx = await requireSchoolAccess(req, res, 'analytics'); if (!ctx) return;
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const prior = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const id = ctx.school._id;
    const [views, viewsPrior, contacts, enquiries, unread, saved] = await Promise.all([
      SchoolEvent.countDocuments({ schoolId: id, type: 'view', createdAt: { $gte: since } }),
      SchoolEvent.countDocuments({ schoolId: id, type: 'view', createdAt: { $gte: prior, $lt: since } }),
      SchoolEvent.countDocuments({ schoolId: id, type: 'contact', createdAt: { $gte: since } }),
      SchoolEnquiry.countDocuments({ schoolId: id, createdAt: { $gte: since } }),
      SchoolEnquiry.countDocuments({ schoolId: id, status: 'unread' }),
      Favorite.countDocuments({ schoolId: id }),
    ]);
    const change = viewsPrior > 0 ? Math.round(((views - viewsPrior) / viewsPrior) * 100) : null;
    res.json({ views, viewsChange: change, contacts, enquiries, unread, saved, galleryPhotos: ctx.school.gallery.length, completion: profileCompletion(ctx.school.toObject()) });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.get('/api/admin/claims', async (req, res) => {
  try {
    const admin = await requireAdmin(req, res); if (!admin) return;
    const status = ['pending', 'approved', 'rejected'].includes(req.query.status) ? req.query.status : 'pending';
    const claims = await SchoolClaim.find({ status }).sort({ createdAt: -1 }).limit(100)
      .populate('schoolId', 'name city region country source verificationStatus').populate('userId', 'fullName email');
    res.json({ claims });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.put('/api/admin/claims/:id/approve', async (req, res) => {
  try {
    const admin = await requireAdmin(req, res); if (!admin) return;
    const claim = await SchoolClaim.findById(req.params.id);
    if (!claim) return res.status(404).json({ message: 'Claim not found' });
    if (claim.status !== 'pending') return res.status(409).json({ message: 'Claim already reviewed' });
    const school = await School.findById(claim.schoolId);
    if (!school) return res.status(404).json({ message: 'School not found' });
    if (school.claimedBy && school.claimedBy.toString() !== claim.userId.toString()) {
      return res.status(409).json({ message: 'School already claimed by another user' });
    }
    school.claimedBy = claim.userId;
    if (school.verificationStatus === 'unverified') school.verificationStatus = 'claimed';
    if (!school.email && claim.contactEmail) school.email = claim.contactEmail;
    await school.save();
    claim.status = 'approved'; claim.reviewedBy = admin._id; claim.reviewNote = String(req.body.note || '');
    await claim.save();
    await SchoolClaim.updateMany({ schoolId: school._id, status: 'pending', _id: { $ne: claim._id } }, { status: 'rejected', reviewedBy: admin._id, reviewNote: 'Another claim was approved' });
    await notifyUser(claim.userId, 'school_claim', `Your claim for ${school.name} was approved. Complete the profile and submit it for verification.`);
    res.json({ claim, school });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.put('/api/admin/claims/:id/reject', async (req, res) => {
  try {
    const admin = await requireAdmin(req, res); if (!admin) return;
    const claim = await SchoolClaim.findById(req.params.id);
    if (!claim) return res.status(404).json({ message: 'Claim not found' });
    if (claim.status !== 'pending') return res.status(409).json({ message: 'Claim already reviewed' });
    const note = String(req.body.reason || '').trim();
    if (!note) return res.status(400).json({ message: 'A rejection reason is required' });
    claim.status = 'rejected'; claim.reviewedBy = admin._id; claim.reviewNote = note;
    await claim.save();
    await notifyUser(claim.userId, 'school_claim', `Your school claim was not approved: ${note}`);
    res.json({ claim });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.get('/api/admin/users', async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const users = await User.find().sort({ _id: -1 });
    res.status(200).json({ users: users.map(publicUser) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/admin/schools/:id', async (req, res) => {
  try {
    const admin = await requireAdmin(req, res); if (!admin) return;
    const allowed = ['name','location','latitude','longitude','type','rating','fees','description','facilities','imageUrl','logoUrl','country','region','city','phone','email','website','programs','admissionRequirements','contactPerson','virtualTourUrl','currency'];
    const update = {};
    for (const key of allowed) if (req.body[key] !== undefined) update[key] = req.body[key];
    const school = await School.findById(req.params.id);
    if (!school) return res.status(404).json({ message: 'School not found' });
    school.set(update);
    await school.save();
    res.json({ school });
  } catch (error) { res.status(400).json({ message: error.message }); }
});

app.delete('/api/admin/schools/:id', async (req, res) => {
  try {
    const admin = await requireAdmin(req, res); if (!admin) return;
    const school = await School.findByIdAndDelete(req.params.id);
    if (!school) return res.status(404).json({ message: 'School not found' });
    await Promise.all([Review.deleteMany({ schoolId: school._id }), Favorite.deleteMany({ schoolId: school._id })]);
    res.json({ deleted: true });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.put('/api/admin/users/:id/status', async (req, res) => {
  try {
    const admin = await requireAdmin(req, res); if (!admin) return;
    const active = Boolean(req.body.active);
    const user = await User.findByIdAndUpdate(req.params.id, { active }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user: publicUser(user) });
  } catch (error) { res.status(400).json({ message: error.message }); }
});

// Only a super_admin can change what role another user holds - a regular admin cannot promote
// anyone to admin (or to super_admin), which is what actually distinguishes the two tiers.
// Promoting someone TO super_admin is deliberately not allowed through this route at all: minting
// a new super_admin always requires running create-admin.js directly against the database, a
// separate, auditable, out-of-band action - not something reachable from inside the app, even by
// an existing super_admin, so a single compromised super_admin session can't silently mint peers.
app.put('/api/admin/users/:id/role', async (req, res) => {
  try {
    const superAdmin = await requireSuperAdmin(req, res);
    if (!superAdmin) return;
    const targetId = req.params.id;
    if (targetId === superAdmin._id.toString()) {
      return res.status(400).json({ message: 'You cannot change your own role' });
    }
    const allowedRoles = ['student', 'parent', 'graduate', 'employer', 'admin'];
    const role = String(req.body.role || '');
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: `role must be one of: ${allowedRoles.join(', ')}` });
    }
    const user = await User.findByIdAndUpdate(targetId, { userType: role }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.status(200).json({ user: publicUser(user) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/admin/reports', async (req, res) => {
  try {
    const admin = await requireAdmin(req, res); if (!admin) return;
    const reports = await Report.find().populate('reporterId targetUserId').sort({ createdAt: -1 });
    res.json({ reports });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.put('/api/admin/reports/:id/status', async (req, res) => {
  try {
    const admin = await requireAdmin(req, res); if (!admin) return;
    const status = String(req.body.status || '');
    if (!['open','reviewed','dismissed'].includes(status)) return res.status(400).json({ message: 'Invalid report status' });
    const report = await Report.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!report) return res.status(404).json({ message: 'Report not found' });
    res.json({ report });
  } catch (error) { res.status(400).json({ message: error.message }); }
});

// Global USD subscription catalogue; prices are server-controlled, not accepted from clients.
// Percentage of each school-fee payment kept as platform revenue (set PLATFORM_FEE_PERCENT in backend/.env).
const PLATFORM_FEE_PERCENT = Math.min(20, Math.max(0, Number(process.env.PLATFORM_FEE_PERCENT ?? 3) || 0));
// Plans that give a school's listing "Featured" placement in search.
const FEATURED_PLAN_KEYS = ['school_premium', 'school_featured'];

const SUBSCRIPTION_PLANS = {
  student_premium: { name: 'Student Premium', audience: ['student', 'graduate'], amount: 4.99, currency: 'USD' },
  school_professional: { name: 'School Professional', audience: ['school'], amount: 19.99, currency: 'USD', perks: ['Verified profile tools', 'Admissions & enquiries', 'Analytics'] },
  school_premium: { name: 'School Premium', audience: ['school'], amount: 49.99, currency: 'USD', perks: ['Featured placement in search', 'Verified profile tools', 'Priority support'] },
  school_featured: { name: 'Featured Listing', audience: ['school'], amount: 14.99, currency: 'USD', perks: ['Featured placement in search'] },
  employer_pro: { name: 'Employer Pro', audience: ['employer'], amount: 49.99, currency: 'USD' },
};

app.get('/api/subscriptions/plans', (req, res) => {
  res.json({ plans: Object.entries(SUBSCRIPTION_PLANS).map(([key, p]) => ({ key, ...p, period: 'month', renewal: 'manual' })) });
});

app.get('/api/subscriptions/me', async (req, res) => {
  try {
    const user = await requireAuth(req, res);
    if (!user) return;
    const subscriptions = await Subscription.find({ userId: user._id }).sort({ createdAt: -1 }).limit(20);
    const active = subscriptions.find((s) => s.status === 'active' && s.endsAt && s.endsAt > new Date()) || null;
    res.json({ active, subscriptions, renewal: 'manual' });
  } catch (error) { res.status(500).json({ message: 'Could not load subscriptions' }); }
});

app.post('/api/subscriptions/checkout', async (req, res) => {
  try {
    const user = await requireAuth(req, res);
    if (!user) return;
    const plan = SUBSCRIPTION_PLANS[String(req.body.planKey || '')];
    if (!plan) return res.status(400).json({ message: 'Choose a valid subscription plan' });
    if (!plan.audience.includes(user.userType)) return res.status(403).json({ message: 'This plan is not available for your account type' });
    const secret = process.env.FLUTTERWAVE_SECRET_KEY;
    if (!secret) return res.status(503).json({ message: 'Subscription checkout is unavailable until FLUTTERWAVE_SECRET_KEY is configured on the server.' });
    const reference = `SCHULLOOP-SUB-${crypto.randomUUID()}`;
    const subscription = await Subscription.create({ userId: user._id, planKey: req.body.planKey, planName: plan.name, amount: plan.amount, currency: plan.currency, reference, status: 'pending' });
    const redirectUrl = String(req.body.redirectUrl || process.env.FLUTTERWAVE_REDIRECT_URL || '').trim();
    if (!redirectUrl) {
      await Subscription.deleteOne({ _id: subscription._id });
      return res.status(503).json({ message: 'Configure FLUTTERWAVE_REDIRECT_URL in backend .env before starting checkout.' });
    }
    const providerResponse = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST', headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tx_ref: reference, amount: plan.amount, currency: plan.currency, redirect_url: redirectUrl,
        payment_options: 'card,mobilemoney', customer: { email: user.email, name: user.fullName, phonenumber: user.phone || '' },
        customizations: { title: 'SchulLoop Subscription', description: `${plan.name} — one month; manual renewal` } }),
    });
    const providerData = await providerResponse.json();
    if (!providerResponse.ok || providerData.status !== 'success' || !providerData.data?.link) {
      await Subscription.deleteOne({ _id: subscription._id });
      return res.status(502).json({ message: providerData.message || 'Could not start secure checkout' });
    }
    res.status(201).json({ subscription, checkoutUrl: providerData.data.link });
  } catch (error) { res.status(500).json({ message: 'Could not start subscription checkout' }); }
});

app.get('/api/subscriptions/verify/:transactionId', async (req, res) => {
  try {
    const user = await requireAuth(req, res);
    if (!user) return;
    const secret = process.env.FLUTTERWAVE_SECRET_KEY;
    if (!secret) return res.status(503).json({ message: 'Flutterwave is not configured' });
    const providerResponse = await fetch(`https://api.flutterwave.com/v3/transactions/${encodeURIComponent(req.params.transactionId)}/verify`, { headers: { Authorization: `Bearer ${secret}` } });
    const providerData = await providerResponse.json();
    if (!providerResponse.ok || providerData.status !== 'success' || !providerData.data) return res.status(502).json({ message: providerData.message || 'Transaction verification failed' });
    const tx = providerData.data;
    const subscription = await Subscription.findOne({ reference: tx.tx_ref, userId: user._id });
    if (!subscription) return res.status(404).json({ message: 'Subscription checkout not found for this account' });
    const amountMatches = Number(tx.amount) >= subscription.amount;
    const currencyMatches = String(tx.currency || '').toUpperCase() === subscription.currency;
    if (tx.status !== 'successful' || !amountMatches || !currencyMatches) {
      if (subscription.status === 'pending') { subscription.status = 'failed'; subscription.transactionId = String(tx.id || ''); await subscription.save(); }
      return res.status(400).json({ verified: false, message: 'The provider transaction does not match this subscription amount, currency, and status.' });
    }
    if (subscription.status !== 'active') {
      const now = new Date();
      const currentActive = await Subscription.findOne({ userId: user._id, status: 'active', endsAt: { $gt: now } }).sort({ endsAt: -1 });
      subscription.startsAt = currentActive && currentActive.endsAt > now ? currentActive.endsAt : now;
      subscription.endsAt = new Date(subscription.startsAt.getTime() + 30 * 24 * 60 * 60 * 1000);
      subscription.status = 'active';
      subscription.transactionId = String(tx.id || req.params.transactionId);
      await subscription.save();
    }
    res.json({ verified: true, subscription, renewal: 'manual' });
  } catch (error) { res.status(500).json({ message: 'Could not verify subscription payment' }); }
});

app.get('/api/admin/payments', async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 100, 1), 250);
    const payments = await Payment.find().populate('userId', 'fullName email').populate('schoolId', 'name country').sort({ createdAt: -1 }).limit(limit);
    res.json({ payments });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.get('/api/admin/revenue', async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const [fees, subs] = await Promise.all([
      Payment.aggregate([{ $match: { status: 'completed' } }, { $group: { _id: null, volume: { $sum: '$amount' }, platformFees: { $sum: '$platformFee' }, count: { $sum: 1 } } }]),
      Subscription.aggregate([{ $match: { status: 'active' } }, { $group: { _id: { planKey: '$planKey', currency: '$currency' }, revenue: { $sum: '$amount' }, count: { $sum: 1 } } }]),
    ]);
    const now = new Date();
    const activeNow = await Subscription.countDocuments({ status: 'active', endsAt: { $gt: now } });
    res.json({
      feePercent: PLATFORM_FEE_PERCENT,
      schoolPayments: fees[0] || { volume: 0, platformFees: 0, count: 0 },
      subscriptions: subs.map((r) => ({ planKey: r._id.planKey, currency: r._id.currency, revenue: r.revenue, count: r.count })),
      activeSubscriptions: activeNow,
    });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.get('/api/admin/analytics', async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const [
      totalUsers,
      totalSchools,
      verifiedSchools,
      totalApplications,
      totalPayments,
      totalMessages,
      totalConnections,
      openReports,
      totalSearches,
      importedSchools,
      pendingClaims,
    ] = await Promise.all([
      User.countDocuments(),
      School.countDocuments(),
      School.countDocuments({ verified: true }),
      Application.countDocuments(),
      Payment.countDocuments(),
      Message.countDocuments(),
      Connection.countDocuments({ status: 'accepted' }),
      Report.countDocuments({ status: 'open' }),
      SearchLog.countDocuments(),
      School.countDocuments({ source: 'imported' }),
      SchoolClaim.countDocuments({ status: 'pending' }),
    ]);
    res.status(200).json({
      totalUsers,
      totalSchools,
      verifiedSchools,
      totalApplications,
      totalPayments,
      totalMessages,
      totalConnections,
      openReports,
      totalSearches,
      importedSchools,
      pendingClaims,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// =====================================================================================
// v3.2: Freelance projects, local services, scholarships & training, saved items,
// capabilities, My Journey and the activities summary. See BACKEND_V32_API.md.
// All routes are under /api. Authorization is enforced here on the server, never in the app.
// =====================================================================================
const V32_PAGE_MAX = 50;
const V32_PROJECT_CATEGORIES = ['Design', 'Development', 'Writing', 'Marketing', 'Video', 'Other'];
const V32_CAPABILITIES = ['student', 'graduate', 'job_seeker', 'freelancer', 'service_provider', 'employer', 'school_representative'];
const V32_SELF_CAPABILITIES = V32_CAPABILITIES.filter((c) => c !== 'school_representative');
const V32_STAGES = ['school_seeker', 'student', 'graduate', 'job_seeker', 'freelancer', 'employer'];
const V32_VISIBILITY = ['public', 'connections', 'private'];

const v32Handle = (fn) => async (req, res) => {
  try { await fn(req, res); } catch (error) {
    console.error('v3.2 route error:', req.method, req.path, error.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
};
const v32Id = (value) => mongoose.Types.ObjectId.isValid(String(value || '')) && String(value).length === 24;
const v32Str = (value, max) => String(value === undefined || value === null ? '' : value).trim().slice(0, max);
const v32Num = (value, min = 0, max = 1e9) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : null;
};
const v32Year = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const n = Math.round(Number(value));
  return Number.isFinite(n) && n >= 1900 && n <= 2100 ? n : null;
};
const v32List = (value, maxItems = 20, maxLen = 40) => {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const out = [];
  for (const item of value) {
    const text = v32Str(item, maxLen);
    if (text && !seen.has(text.toLowerCase())) { seen.add(text.toLowerCase()); out.push(text); }
    if (out.length >= maxItems) break;
  }
  return out;
};
const v32Paging = (req) => {
  const limit = Math.min(V32_PAGE_MAX, Math.max(1, parseInt(req.query.limit, 10) || V32_PAGE_MAX));
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  return { limit, skip: (page - 1) * limit };
};
const v32Search = (req, key = 'q') => {
  const raw = typeof req.query[key] === 'string' ? req.query[key].trim().slice(0, 80) : '';
  return raw ? new RegExp(escapeRegex(raw), 'i') : null;
};
const v32Enum = (value, allowed) => (allowed.includes(value) ? value : null);
const v32Url = (value) => {
  const text = v32Str(value, 500);
  return /^https?:\/\/\S+$/i.test(text) ? text : '';
};
const v32Admin = (user) => isAdminRole(user.userType);
const v32Same = (a, b) => String(a) === String(b);
async function v32OptionalUser(req) { return authenticatedUser(req); }
const v32Name = (user) => (user && user.fullName) || 'User';

function v32InferCapabilities(user) {
  const map = { student: ['student'], graduate: ['graduate', 'job_seeker'], employer: ['employer'], school: ['school_representative'] };
  return map[user.userType] || [];
}
function v32CurrentCapabilities(user) {
  return user.capabilities && user.capabilities.length ? [...user.capabilities] : v32InferCapabilities(user);
}
// Adds a capability without ever changing userType. Materialises inferred capabilities first so
// that granting one never hides the ones implied by the account type.
async function v32GrantCapability(user, capability) {
  const current = v32CurrentCapabilities(user);
  if (current.includes(capability)) return;
  user.capabilities = [...current, capability];
  await user.save();
}

// ---------- Capabilities ----------
app.get('/api/me/capabilities', v32Handle(async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return;
  res.json({ capabilities: v32CurrentCapabilities(user) });
}));

app.put('/api/me/capabilities', v32Handle(async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return;
  const add = v32List(req.body.add, 10, 40);
  const remove = v32List(req.body.remove, 10, 40);
  if ([...add, ...remove].some((c) => !V32_CAPABILITIES.includes(c))) return res.status(400).json({ message: 'Unknown capability' });
  if (add.includes('school_representative')) return res.status(403).json({ message: 'School representative status is granted through school verification' });
  const next = new Set(v32CurrentCapabilities(user));
  add.forEach((c) => next.add(c));
  remove.forEach((c) => next.delete(c));
  user.capabilities = [...next];
  await user.save();
  res.json({ capabilities: user.capabilities });
}));

// ---------- My Journey ----------
function v32SerializeJourney(user) {
  const j = (user.journey && typeof user.journey.toObject === 'function') ? user.journey.toObject() : (user.journey || {});
  const stageFallback = { student: 'student', graduate: 'graduate', employer: 'employer', parent: 'school_seeker' }[user.userType] || 'school_seeker';
  const vis = j.visibility || {};
  return {
    stage: j.stage || stageFallback,
    education: j.education || [],
    qualifications: j.qualifications || [],
    skills: j.skills || [],
    experience: j.experience || [],
    careerGoals: j.careerGoals || '',
    visibility: {
      education: vis.education || 'public', experience: vis.experience || 'public',
      skills: vis.skills || 'public', contact: vis.contact || 'private',
    },
  };
}

app.get('/api/me/journey', v32Handle(async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return;
  res.json({ journey: v32SerializeJourney(user) });
}));

app.put('/api/me/journey', v32Handle(async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return;
  const body = req.body || {};
  const current = v32SerializeJourney(user);
  const next = { ...current };
  if (body.stage !== undefined) {
    if (!V32_STAGES.includes(body.stage)) return res.status(400).json({ message: 'Invalid stage' });
    next.stage = body.stage;
  }
  if (body.education !== undefined) {
    if (!Array.isArray(body.education)) return res.status(400).json({ message: 'education must be a list' });
    next.education = body.education.slice(0, 15).map((e) => ({
      institution: v32Str(e && e.institution, 160), programme: v32Str(e && e.programme, 160),
      qualification: v32Str(e && e.qualification, 120), startYear: v32Year(e && e.startYear),
      endYear: v32Year(e && e.endYear), graduated: !!(e && e.graduated),
    })).filter((e) => e.institution || e.programme);
  }
  if (body.qualifications !== undefined) {
    if (!Array.isArray(body.qualifications)) return res.status(400).json({ message: 'qualifications must be a list' });
    next.qualifications = body.qualifications.slice(0, 20).map((q) => ({
      title: v32Str(q && q.title, 160), issuer: v32Str(q && q.issuer, 160), year: v32Year(q && q.year),
    })).filter((q) => q.title);
  }
  if (body.skills !== undefined) next.skills = v32List(body.skills, 30, 40);
  if (body.experience !== undefined) {
    if (!Array.isArray(body.experience)) return res.status(400).json({ message: 'experience must be a list' });
    next.experience = body.experience.slice(0, 20).map((x) => ({
      title: v32Str(x && x.title, 120), company: v32Str(x && x.company, 120), startYear: v32Year(x && x.startYear),
      endYear: v32Year(x && x.endYear), description: v32Str(x && x.description, 1000),
    })).filter((x) => x.title || x.company);
  }
  if (body.careerGoals !== undefined) next.careerGoals = v32Str(body.careerGoals, 1000);
  if (body.visibility !== undefined) {
    const v = body.visibility && typeof body.visibility === 'object' ? body.visibility : {};
    const vis = { ...current.visibility };
    for (const key of ['education', 'experience', 'skills', 'contact']) {
      if (v[key] !== undefined) {
        if (!V32_VISIBILITY.includes(v[key])) return res.status(400).json({ message: `Invalid visibility for ${key}` });
        vis[key] = v[key];
      }
    }
    next.visibility = vis;
  }
  // Strip client-supplied _ids so Mongo issues fresh ones.
  user.journey = next;
  await user.save();
  res.json({ journey: v32SerializeJourney(user) });
}));

// ---------- Saved items ----------
app.post('/api/saved/toggle', v32Handle(async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return;
  const itemType = v32Enum(req.body.itemType, SAVED_TYPES);
  const itemId = v32Str(req.body.itemId, 64);
  if (!itemType || !itemId) return res.status(400).json({ message: 'Valid itemType and itemId are required' });
  const existing = await SavedItem.findOne({ userId: user._id, itemType, itemId });
  if (existing) { await existing.deleteOne(); return res.json({ saved: false }); }
  try { await SavedItem.create({ userId: user._id, itemType, itemId }); } catch (error) { if (error.code !== 11000) throw error; }
  res.json({ saved: true });
}));

app.get('/api/saved', v32Handle(async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return;
  const filter = { userId: user._id };
  if (req.query.itemType !== undefined) {
    const itemType = v32Enum(req.query.itemType, SAVED_TYPES);
    if (!itemType) return res.status(400).json({ message: 'Invalid itemType' });
    filter.itemType = itemType;
  }
  const items = await SavedItem.find(filter).sort({ createdAt: -1 }).limit(200).lean();
  res.json({ items: items.map((i) => ({ itemType: i.itemType, itemId: i.itemId, createdAt: i.createdAt })) });
}));

// ---------- Projects (freelance) ----------
async function v32ProposalCounts(projectIds) {
  if (!projectIds.length) return {};
  const rows = await Proposal.aggregate([{ $match: { projectId: { $in: projectIds } } }, { $group: { _id: '$projectId', n: { $sum: 1 } } }]);
  return Object.fromEntries(rows.map((r) => [String(r._id), r.n]));
}
async function v32SerializeProjects(projects) {
  const counts = await v32ProposalCounts(projects.map((p) => p._id));
  const owners = await User.find({ _id: { $in: projects.map((p) => p.ownerId) } }).select('fullName').lean();
  const names = Object.fromEntries(owners.map((o) => [String(o._id), o.fullName]));
  return projects.map((p) => {
    const doc = typeof p.toObject === 'function' ? p.toObject() : p;
    return {
      _id: doc._id, title: doc.title, description: doc.description, category: doc.category, skills: doc.skills || [],
      budgetMin: doc.budgetMin, budgetMax: doc.budgetMax, budgetType: doc.budgetType, duration: doc.duration,
      status: doc.status, ownerId: doc.ownerId, ownerName: names[String(doc.ownerId)] || 'User',
      proposalCount: counts[String(doc._id)] || 0, createdAt: doc.createdAt,
    };
  });
}
function v32ProjectFields(body, partial = false) {
  const out = {};
  const errors = [];
  if (!partial || body.title !== undefined) { out.title = v32Str(body.title, 140); if (!out.title) errors.push('Title is required'); }
  if (!partial || body.description !== undefined) out.description = v32Str(body.description, 5000);
  if (!partial || body.category !== undefined) {
    out.category = v32Enum(body.category, V32_PROJECT_CATEGORIES) || (body.category === undefined ? 'Other' : null);
    if (!out.category) errors.push('Invalid category');
  }
  if (!partial || body.skills !== undefined) out.skills = v32List(body.skills, 15, 40);
  if (!partial || body.budgetMin !== undefined) out.budgetMin = v32Num(body.budgetMin === undefined ? 0 : body.budgetMin);
  if (!partial || body.budgetMax !== undefined) out.budgetMax = v32Num(body.budgetMax === undefined ? 0 : body.budgetMax);
  if (out.budgetMin === null || out.budgetMax === null) errors.push('Budget must be a number');
  if (out.budgetMin !== undefined && out.budgetMax !== undefined && out.budgetMax && out.budgetMin > out.budgetMax) errors.push('Minimum budget cannot exceed maximum');
  if (!partial || body.budgetType !== undefined) {
    out.budgetType = v32Enum(body.budgetType, ['fixed', 'hourly']) || (body.budgetType === undefined ? 'fixed' : null);
    if (!out.budgetType) errors.push('Invalid budgetType');
  }
  if (!partial || body.duration !== undefined) out.duration = v32Str(body.duration, 80);
  return { out, errors };
}

app.get('/api/projects', v32Handle(async (req, res) => {
  const filter = { status: 'open' };
  const status = v32Enum(req.query.status, ['open', 'in_progress', 'completed', 'cancelled']);
  if (status) filter.status = status; // drafts are never public
  const category = v32Enum(req.query.category, V32_PROJECT_CATEGORIES);
  if (category) filter.category = category;
  const q = v32Search(req);
  if (q) filter.$or = [{ title: q }, { description: q }, { skills: q }];
  const { limit, skip } = v32Paging(req);
  const projects = await Project.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);
  res.json({ projects: await v32SerializeProjects(projects) });
}));

app.post('/api/projects', v32Handle(async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return;
  const { out, errors } = v32ProjectFields(req.body || {});
  if (errors.length) return res.status(400).json({ message: errors[0] });
  const project = await Project.create({ ...out, ownerId: user._id, status: 'open' });
  const [serialized] = await v32SerializeProjects([project]);
  res.status(201).json({ project: serialized });
}));

// Declared before /api/projects/:id on purpose.
app.get('/api/projects/mine', v32Handle(async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return;
  const posted = await Project.find({ ownerId: user._id }).sort({ createdAt: -1 }).limit(100);
  const proposals = await Proposal.find({ freelancerId: user._id }).sort({ createdAt: -1 }).limit(100)
    .populate('projectId', 'title status category').lean();
  res.json({
    posted: await v32SerializeProjects(posted),
    proposals: proposals.filter((p) => p.projectId).map((p) => ({
      _id: p._id, projectId: p.projectId, message: p.message, price: p.price,
      deliveryDays: p.deliveryDays, status: p.status, createdAt: p.createdAt,
    })),
  });
}));

app.get('/api/projects/:id', v32Handle(async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return;
  if (!v32Id(req.params.id)) return res.status(404).json({ message: 'Project not found' });
  const project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json({ message: 'Project not found' });
  const isOwner = v32Same(project.ownerId, user._id);
  if (project.status === 'draft' && !isOwner && !v32Admin(user)) return res.status(404).json({ message: 'Project not found' });
  const myProposal = await Proposal.findOne({ projectId: project._id, freelancerId: user._id }).lean();
  const [serialized] = await v32SerializeProjects([project]);
  res.json({ project: serialized, myProposal: myProposal || null, isOwner });
}));

app.put('/api/projects/:id/status', v32Handle(async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return;
  if (!v32Id(req.params.id)) return res.status(404).json({ message: 'Project not found' });
  const status = v32Enum(req.body.status, ['draft', 'open', 'in_progress', 'completed', 'cancelled']);
  if (!status) return res.status(400).json({ message: 'Invalid status' });
  const project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json({ message: 'Project not found' });
  if (!v32Same(project.ownerId, user._id) && !v32Admin(user)) return res.status(403).json({ message: 'Only the project owner can change its status' });
  project.status = status;
  await project.save();
  if (status === 'cancelled') {
    const selected = await Proposal.findOne({ projectId: project._id, status: 'selected' });
    if (selected) await notifyUser(selected.freelancerId, 'project_status', `The project "${project.title}" was cancelled by its owner.`);
  } else if (status === 'completed') {
    const selected = await Proposal.findOne({ projectId: project._id, status: 'selected' });
    if (selected) await notifyUser(selected.freelancerId, 'project_status', `The project "${project.title}" was marked completed.`);
  }
  const [serialized] = await v32SerializeProjects([project]);
  res.json({ project: serialized });
}));

app.post('/api/projects/:id/proposals', v32Handle(async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return;
  if (!v32Id(req.params.id)) return res.status(404).json({ message: 'Project not found' });
  const project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json({ message: 'Project not found' });
  if (v32Same(project.ownerId, user._id)) return res.status(403).json({ message: 'You cannot submit a proposal to your own project' });
  if (project.status !== 'open') return res.status(400).json({ message: 'This project is not open for proposals' });
  const message = v32Str(req.body.message, 3000);
  const price = v32Num(req.body.price);
  const deliveryDays = v32Num(req.body.deliveryDays, 0, 3650);
  if (!message) return res.status(400).json({ message: 'A message is required' });
  if (price === null || price <= 0) return res.status(400).json({ message: 'A valid price is required' });
  if (deliveryDays === null) return res.status(400).json({ message: 'Delivery days must be a number' });
  let proposal;
  try {
    proposal = await Proposal.create({ projectId: project._id, freelancerId: user._id, message, price, deliveryDays: Math.round(deliveryDays), status: 'submitted' });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'You have already submitted a proposal for this project' });
    throw error;
  }
  await notifyUser(project.ownerId, 'proposal_received', `${v32Name(user)} sent a proposal for "${project.title}".`);
  res.status(201).json({ proposal });
}));

app.get('/api/projects/:id/proposals', v32Handle(async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return;
  if (!v32Id(req.params.id)) return res.status(404).json({ message: 'Project not found' });
  const project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json({ message: 'Project not found' });
  if (!v32Same(project.ownerId, user._id) && !v32Admin(user)) return res.status(403).json({ message: 'Only the project owner can view proposals' });
  const proposals = await Proposal.find({ projectId: project._id }).sort({ createdAt: -1 }).limit(200).populate('freelancerId', 'fullName').lean();
  const profiles = await FreelancerProfile.find({ userId: { $in: proposals.map((p) => p.freelancerId && p.freelancerId._id).filter(Boolean) } }).select('userId title').lean();
  const titles = Object.fromEntries(profiles.map((p) => [String(p.userId), p.title]));
  res.json({
    proposals: proposals.filter((p) => p.freelancerId).map((p) => ({
      _id: p._id, message: p.message, price: p.price, deliveryDays: p.deliveryDays, status: p.status, createdAt: p.createdAt,
      freelancer: { _id: p.freelancerId._id, name: p.freelancerId.fullName, title: titles[String(p.freelancerId._id)] || '' },
    })),
  });
}));

app.put('/api/proposals/:id/select', v32Handle(async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return;
  if (!v32Id(req.params.id)) return res.status(404).json({ message: 'Proposal not found' });
  const proposal = await Proposal.findById(req.params.id);
  if (!proposal) return res.status(404).json({ message: 'Proposal not found' });
  const project = await Project.findById(proposal.projectId);
  if (!project) return res.status(404).json({ message: 'Project not found' });
  if (!v32Same(project.ownerId, user._id)) return res.status(403).json({ message: 'Only the project owner can select a proposal' });
  if (project.status !== 'open') return res.status(400).json({ message: 'A freelancer can only be selected while the project is open' });
  if (proposal.status !== 'submitted') return res.status(400).json({ message: 'This proposal can no longer be selected' });
  proposal.status = 'selected';
  await proposal.save();
  project.status = 'in_progress';
  await project.save();
  const others = await Proposal.find({ projectId: project._id, _id: { $ne: proposal._id }, status: 'submitted' });
  await Proposal.updateMany({ _id: { $in: others.map((o) => o._id) } }, { status: 'rejected' });
  await notifyUser(proposal.freelancerId, 'proposal_selected', `You were selected for "${project.title}".`);
  for (const other of others) await notifyUser(other.freelancerId, 'proposal_rejected', `Another freelancer was selected for "${project.title}".`);
  const [serialized] = await v32SerializeProjects([project]);
  res.json({ proposal, project: serialized });
}));

// ---------- Freelancers ----------
function v32SerializeFreelancer(profile, name) {
  return {
    _id: profile._id, userId: profile.userId, name: name || 'User', title: profile.title, skills: profile.skills || [],
    rate: profile.rate, availability: profile.availability, bio: profile.bio, location: profile.location,
    portfolio: (profile.portfolio || []).map((p) => ({ title: p.title, url: p.url })),
  };
}

app.get('/api/freelancers', v32Handle(async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return;
  const filter = {};
  const q = v32Search(req);
  if (q) filter.$or = [{ title: q }, { skills: q }, { bio: q }, { location: q }];
  const skill = v32Search(req, 'skill');
  if (skill) filter.skills = skill;
  const { limit, skip } = v32Paging(req);
  const profiles = await FreelancerProfile.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).populate('userId', 'fullName active').lean();
  res.json({
    freelancers: profiles.filter((p) => p.userId && p.userId.active !== false)
      .map((p) => v32SerializeFreelancer({ ...p, userId: p.userId._id }, p.userId.fullName)),
  });
}));

app.get('/api/me/freelancer', v32Handle(async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return;
  const profile = await FreelancerProfile.findOne({ userId: user._id }).lean();
  res.json({ freelancer: profile ? v32SerializeFreelancer(profile, user.fullName) : null });
}));

app.put('/api/me/freelancer', v32Handle(async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return;
  const body = req.body || {};
  const availability = body.availability === undefined ? 'available' : v32Enum(body.availability, ['available', 'busy']);
  if (!availability) return res.status(400).json({ message: 'Invalid availability' });
  const portfolio = Array.isArray(body.portfolio) ? body.portfolio.slice(0, 10).map((p) => ({
    title: v32Str(p && p.title, 120), url: v32Url(p && p.url),
  })).filter((p) => p.title || p.url) : [];
  const update = {
    title: v32Str(body.title, 120), skills: v32List(body.skills, 20, 40), rate: v32Str(body.rate, 60),
    availability, bio: v32Str(body.bio, 2000), location: v32Str(body.location, 120), portfolio,
  };
  const profile = await FreelancerProfile.findOneAndUpdate({ userId: user._id }, { $set: update }, { new: true, upsert: true, setDefaultsOnInsert: true }).lean();
  await v32GrantCapability(user, 'freelancer');
  res.json({ freelancer: v32SerializeFreelancer(profile, user.fullName) });
}));

// ---------- Local services ----------
function v32SerializeService(service, providerName) {
  const doc = typeof service.toObject === 'function' ? service.toObject() : service;
  return {
    _id: doc._id, providerId: doc.providerId, providerName: providerName || 'User', title: doc.title, category: doc.category,
    description: doc.description, area: doc.area, city: doc.city, pricing: doc.pricing, availability: doc.availability,
    contactMethod: doc.contactMethod, status: doc.status, createdAt: doc.createdAt,
  };
}
async function v32SerializeServices(services) {
  const users = await User.find({ _id: { $in: services.map((s) => s.providerId) } }).select('fullName').lean();
  const names = Object.fromEntries(users.map((u) => [String(u._id), u.fullName]));
  return services.map((s) => v32SerializeService(s, names[String(s.providerId)]));
}
function v32ServiceFields(body, partial = false) {
  const out = {};
  const errors = [];
  if (!partial || body.title !== undefined) { out.title = v32Str(body.title, 140); if (!out.title) errors.push('Title is required'); }
  if (!partial || body.category !== undefined) {
    out.category = v32Enum(body.category, SERVICE_CATEGORIES) || (body.category === undefined ? 'Other' : null);
    if (!out.category) errors.push('Invalid category');
  }
  const texts = { description: 3000, area: 120, city: 80, pricing: 120, availability: 120, contactMethod: 120 };
  for (const [key, max] of Object.entries(texts)) if (!partial || body[key] !== undefined) out[key] = v32Str(body[key], max);
  if (!partial && !out.description) errors.push('Description is required');
  return { out, errors };
}
async function v32SerializeRequests(requests) {
  const ids = [...requests.map((r) => r.customerId), ...requests.map((r) => r.providerId)];
  const users = await User.find({ _id: { $in: ids } }).select('fullName').lean();
  const names = Object.fromEntries(users.map((u) => [String(u._id), u.fullName]));
  return requests.map((r) => {
    const doc = typeof r.toObject === 'function' ? r.toObject() : r;
    return {
      _id: doc._id, serviceId: doc.serviceId, serviceTitle: doc.serviceTitle, providerId: doc.providerId,
      providerName: names[String(doc.providerId)] || 'User', customerId: doc.customerId,
      customerName: names[String(doc.customerId)] || 'User', message: doc.message, preferredDate: doc.preferredDate,
      contactInfo: doc.contactInfo, status: doc.status, quote: doc.quote || null, createdAt: doc.createdAt,
    };
  });
}

app.get('/api/services', v32Handle(async (req, res) => {
  const filter = { status: 'active' };
  const category = v32Enum(req.query.category, SERVICE_CATEGORIES);
  if (category) filter.category = category;
  const city = v32Search(req, 'city');
  if (city) filter.city = city;
  const q = v32Search(req);
  if (q) filter.$or = [{ title: q }, { description: q }, { area: q }, { city: q }];
  const { limit, skip } = v32Paging(req);
  const services = await ServiceListing.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);
  res.json({ services: await v32SerializeServices(services) });
}));

app.post('/api/services', v32Handle(async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return;
  const { out, errors } = v32ServiceFields(req.body || {});
  if (errors.length) return res.status(400).json({ message: errors[0] });
  const service = await ServiceListing.create({ ...out, providerId: user._id, status: 'active' });
  await v32GrantCapability(user, 'service_provider');
  res.status(201).json({ service: v32SerializeService(service, user.fullName) });
}));

// Declared before /api/services/:id on purpose.
app.get('/api/services/mine', v32Handle(async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return;
  const listings = await ServiceListing.find({ providerId: user._id }).sort({ createdAt: -1 }).limit(100);
  const requests = await ServiceRequest.find({ customerId: user._id }).sort({ createdAt: -1 }).limit(100);
  res.json({ listings: await v32SerializeServices(listings), requests: await v32SerializeRequests(requests) });
}));

app.get('/api/services/requests/incoming', v32Handle(async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return;
  const requests = await ServiceRequest.find({ providerId: user._id }).sort({ createdAt: -1 }).limit(100);
  res.json({ requests: await v32SerializeRequests(requests) });
}));

app.get('/api/services/:id', v32Handle(async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return;
  if (!v32Id(req.params.id)) return res.status(404).json({ message: 'Service not found' });
  const service = await ServiceListing.findById(req.params.id);
  if (!service) return res.status(404).json({ message: 'Service not found' });
  const isOwner = v32Same(service.providerId, user._id);
  if (service.status === 'closed' && !isOwner && !v32Admin(user)) return res.status(404).json({ message: 'Service not found' });
  const mine = await ServiceRequest.findOne({ serviceId: service._id, customerId: user._id }).sort({ createdAt: -1 });
  const [serialized] = await v32SerializeServices([service]);
  const [myRequest] = mine ? await v32SerializeRequests([mine]) : [null];
  res.json({ service: serialized, isOwner, myRequest: myRequest || null });
}));

app.put('/api/services/:id', v32Handle(async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return;
  if (!v32Id(req.params.id)) return res.status(404).json({ message: 'Service not found' });
  const service = await ServiceListing.findById(req.params.id);
  if (!service) return res.status(404).json({ message: 'Service not found' });
  if (!v32Same(service.providerId, user._id) && !v32Admin(user)) return res.status(403).json({ message: 'Only the listing owner can edit it' });
  const body = req.body || {};
  const { out, errors } = v32ServiceFields(body, true);
  if (body.status !== undefined) {
    const status = v32Enum(body.status, ['active', 'closed']);
    if (!status) errors.push('Invalid status');
    else out.status = status;
  }
  if (errors.length) return res.status(400).json({ message: errors[0] });
  Object.assign(service, out);
  await service.save();
  const [serialized] = await v32SerializeServices([service]);
  res.json({ service: serialized });
}));

app.delete('/api/services/:id', v32Handle(async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return;
  if (!v32Id(req.params.id)) return res.status(404).json({ message: 'Service not found' });
  const service = await ServiceListing.findById(req.params.id);
  if (!service) return res.status(404).json({ message: 'Service not found' });
  if (!v32Same(service.providerId, user._id) && !v32Admin(user)) return res.status(403).json({ message: 'Only the listing owner can close it' });
  service.status = 'closed';
  await service.save();
  res.json({ ok: true });
}));

app.post('/api/services/:id/requests', v32Handle(async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return;
  if (!v32Id(req.params.id)) return res.status(404).json({ message: 'Service not found' });
  const service = await ServiceListing.findById(req.params.id);
  if (!service) return res.status(404).json({ message: 'Service not found' });
  if (v32Same(service.providerId, user._id)) return res.status(403).json({ message: 'You cannot request your own service' });
  if (service.status !== 'active') return res.status(400).json({ message: 'This listing is no longer active' });
  const message = v32Str(req.body.message, 2000);
  if (!message) return res.status(400).json({ message: 'A message is required' });
  const open = await ServiceRequest.findOne({ serviceId: service._id, customerId: user._id, status: { $in: ['requested', 'quotation_sent', 'accepted', 'in_progress'] } });
  if (open) return res.status(409).json({ message: 'You already have an active request for this service' });
  const request = await ServiceRequest.create({
    serviceId: service._id, serviceTitle: service.title, providerId: service.providerId, customerId: user._id, message,
    preferredDate: v32Str(req.body.preferredDate, 60), contactInfo: v32Str(req.body.contactInfo, 200), status: 'requested',
  });
  await notifyUser(service.providerId, 'service_request', `${v32Name(user)} requested your service "${service.title}".`);
  const [serialized] = await v32SerializeRequests([request]);
  res.status(201).json({ request: serialized });
}));

const V32_TERMINAL = ['completed', 'cancelled', 'reported'];
app.put('/api/service-requests/:id', v32Handle(async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return;
  if (!v32Id(req.params.id)) return res.status(404).json({ message: 'Request not found' });
  const request = await ServiceRequest.findById(req.params.id);
  if (!request) return res.status(404).json({ message: 'Request not found' });
  const isProvider = v32Same(request.providerId, user._id);
  const isCustomer = v32Same(request.customerId, user._id);
  if (!isProvider && !isCustomer) return res.status(403).json({ message: 'You are not part of this request' });
  const status = v32Enum(req.body.status, SERVICE_REQUEST_STATUSES);
  if (!status) return res.status(400).json({ message: 'Invalid status' });
  if (V32_TERMINAL.includes(request.status)) return res.status(400).json({ message: 'This request is already closed' });
  let allowed;
  if (isProvider) allowed = ['quotation_sent', 'in_progress', 'completed', 'cancelled'];
  else allowed = ['accepted', 'cancelled'];
  if (!allowed.includes(status)) return res.status(403).json({ message: 'You cannot set this status' });
  if (status === 'quotation_sent') {
    const amount = v32Num(req.body.quote && req.body.quote.amount);
    if (amount === null || amount <= 0) return res.status(400).json({ message: 'A quotation amount is required' });
    if (!['requested', 'quotation_sent'].includes(request.status)) return res.status(400).json({ message: 'A quotation can no longer be sent' });
    request.quote = { amount, note: v32Str(req.body.quote.note, 500) };
  }
  if (status === 'accepted' && request.status !== 'quotation_sent') return res.status(400).json({ message: 'There is no quotation to accept yet' });
  if (status === 'in_progress' && !['requested', 'quotation_sent', 'accepted'].includes(request.status)) return res.status(400).json({ message: 'Invalid status change' });
  if (status === 'completed' && !['accepted', 'in_progress'].includes(request.status)) return res.status(400).json({ message: 'Invalid status change' });
  request.status = status;
  await request.save();
  const label = status.replace(/_/g, ' ');
  await notifyUser(isProvider ? request.customerId : request.providerId, 'service_request_update',
    `Your service request "${request.serviceTitle}" is now ${label}.`);
  const [serialized] = await v32SerializeRequests([request]);
  res.json({ request: serialized });
}));

// ---------- Scholarships & training ----------
function v32SerializeScholarship(item) {
  const doc = typeof item.toObject === 'function' ? item.toObject() : item;
  return {
    _id: doc._id, title: doc.title, provider: doc.provider, type: doc.type, level: doc.level, location: doc.location,
    mode: doc.mode, deadline: doc.deadline, description: doc.description, eligibility: doc.eligibility,
    applyUrl: doc.applyUrl, source: doc.source, verified: !!doc.verified,
  };
}
function v32ScholarshipFields(body, partial = false) {
  const out = {};
  const errors = [];
  if (!partial || body.title !== undefined) { out.title = v32Str(body.title, 200); if (!out.title) errors.push('Title is required'); }
  const enums = { type: ['scholarship', 'training', 'webinar', 'immigration'], level: ['Undergraduate', 'Postgraduate', 'Other'], mode: ['online', 'in_person', 'hybrid'] };
  const defaults = { type: 'scholarship', level: 'Other', mode: 'online' };
  for (const key of Object.keys(enums)) {
    if (!partial || body[key] !== undefined) {
      out[key] = body[key] === undefined ? defaults[key] : v32Enum(body[key], enums[key]);
      if (!out[key]) errors.push(`Invalid ${key}`);
    }
  }
  const texts = { provider: 160, location: 160, description: 4000, eligibility: 2000, source: 160 };
  for (const [key, max] of Object.entries(texts)) if (!partial || body[key] !== undefined) out[key] = v32Str(body[key], max);
  if (!partial || body.applyUrl !== undefined) {
    out.applyUrl = v32Url(body.applyUrl);
    if (body.applyUrl && !out.applyUrl) errors.push('applyUrl must start with http:// or https://');
  }
  if (!partial || body.deadline !== undefined) {
    if (!body.deadline) out.deadline = null;
    else {
      const date = new Date(body.deadline);
      if (Number.isNaN(date.getTime())) errors.push('Invalid deadline'); else out.deadline = date;
    }
  }
  if (body.verified !== undefined) out.verified = !!body.verified;
  return { out, errors };
}

app.get('/api/scholarships', v32Handle(async (req, res) => {
  const filter = {};
  const type = v32Enum(req.query.type, ['scholarship', 'training', 'webinar', 'immigration']);
  if (type) filter.type = type;
  const level = v32Enum(req.query.level, ['Undergraduate', 'Postgraduate', 'Other']);
  if (level) filter.level = level;
  const q = v32Search(req);
  if (q) filter.$or = [{ title: q }, { provider: q }, { description: q }, { location: q }];
  const { limit, skip } = v32Paging(req);
  const items = await Scholarship.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);
  res.json({ items: items.map(v32SerializeScholarship) });
}));

app.post('/api/admin/scholarships', v32Handle(async (req, res) => {
  const admin = await requireAdmin(req, res); if (!admin) return;
  const { out, errors } = v32ScholarshipFields(req.body || {});
  if (errors.length) return res.status(400).json({ message: errors[0] });
  const item = await Scholarship.create(out);
  res.status(201).json({ item: v32SerializeScholarship(item) });
}));

app.put('/api/admin/scholarships/:id', v32Handle(async (req, res) => {
  const admin = await requireAdmin(req, res); if (!admin) return;
  if (!v32Id(req.params.id)) return res.status(404).json({ message: 'Item not found' });
  const { out, errors } = v32ScholarshipFields(req.body || {}, true);
  if (errors.length) return res.status(400).json({ message: errors[0] });
  const item = await Scholarship.findByIdAndUpdate(req.params.id, { $set: out }, { new: true });
  if (!item) return res.status(404).json({ message: 'Item not found' });
  res.json({ item: v32SerializeScholarship(item) });
}));

app.delete('/api/admin/scholarships/:id', v32Handle(async (req, res) => {
  const admin = await requireAdmin(req, res); if (!admin) return;
  if (!v32Id(req.params.id)) return res.status(404).json({ message: 'Item not found' });
  const item = await Scholarship.findByIdAndDelete(req.params.id);
  if (!item) return res.status(404).json({ message: 'Item not found' });
  res.json({ ok: true });
}));

// ---------- Activities summary ----------
app.get('/api/activities/summary', v32Handle(async (req, res) => {
  const user = await requireAuth(req, res); if (!user) return;
  const uid = user._id;
  const [favSchools, savedSchools, jobApplications, projectsPosted, proposalsSent, serviceRequestsSent, serviceRequestsIncoming, listings] = await Promise.all([
    Favorite.countDocuments({ userId: uid }),
    SavedItem.countDocuments({ userId: uid, itemType: 'school' }),
    Application.countDocuments({ userId: uid }),
    Project.countDocuments({ ownerId: uid }),
    Proposal.countDocuments({ freelancerId: uid }),
    ServiceRequest.countDocuments({ customerId: uid }),
    ServiceRequest.countDocuments({ providerId: uid }),
    ServiceListing.countDocuments({ providerId: uid }),
  ]);
  const [apps, proposals, requests, saved] = await Promise.all([
    Application.find({ userId: uid }).sort({ appliedAt: -1 }).limit(10).lean(),
    Proposal.find({ freelancerId: uid }).sort({ createdAt: -1 }).limit(10).populate('projectId', 'title').lean(),
    ServiceRequest.find({ customerId: uid }).sort({ createdAt: -1 }).limit(10).lean(),
    SavedItem.find({ userId: uid }).sort({ createdAt: -1 }).limit(10).lean(),
  ]);
  const savedTitles = {};
  for (const [type, Model, field] of [['scholarship', Scholarship, 'title'], ['project', Project, 'title'], ['service', ServiceListing, 'title']]) {
    const ids = saved.filter((s) => s.itemType === type && v32Id(s.itemId)).map((s) => s.itemId);
    if (!ids.length) continue;
    const docs = await Model.find({ _id: { $in: ids } }).select(field).lean();
    docs.forEach((d) => { savedTitles[`${type}:${d._id}`] = d[field]; });
  }
  const savedRoutes = { scholarship: 'ScholarshipDetail', project: 'ProjectDetail', service: 'ServiceDetail', job: 'JobPortal', school: 'Favorites' };
  const recent = [
    ...apps.map((a) => ({ type: 'job_application', title: a.jobTitle || 'Job application', status: a.status, at: a.appliedAt, route: 'MyJobApplications', params: {} })),
    ...proposals.filter((p) => p.projectId).map((p) => ({ type: 'proposal', title: p.projectId.title, status: p.status, at: p.createdAt, route: 'ProjectDetail', params: { id: String(p.projectId._id) } })),
    ...requests.map((r) => ({ type: 'service_request', title: r.serviceTitle || 'Service request', status: r.status, at: r.createdAt, route: 'ServiceDetail', params: { id: String(r.serviceId) } })),
    ...saved.map((s) => ({
      type: 'saved', title: savedTitles[`${s.itemType}:${s.itemId}`] || `Saved ${s.itemType}`, status: 'saved', at: s.createdAt,
      route: savedRoutes[s.itemType], params: ['school', 'job'].includes(s.itemType) ? {} : { id: s.itemId },
    })),
  ].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 10);
  res.json({
    savedSchools: Math.max(favSchools, 0) + savedSchools, jobApplications, projectsPosted, proposalsSent,
    serviceRequestsSent, serviceRequestsIncoming, listings, recent,
  });
}));

// --- Socket.IO Real-Time Chat & Connection Events ---
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || '';
    if (!JWT_SECRET || !token) return next(new Error('Authentication required'));
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (!user || user.active === false) return next(new Error('Authentication required'));
    socket.user = user;
    next();
  } catch { next(new Error('Authentication required')); }
});

io.on('connection', (socket) => {
  socket.join(`user:${socket.user._id}`);
  socket.on('join_conversation', async (conversationId) => {
    const conversation = await resolveConversation(conversationId, socket.user);
    if (conversation) socket.join(conversation._id.toString());
  });
  socket.on('send_message', async (data) => {
    try {
      const { conversationId, text } = data;
      const trimmed = String(text || '').trim();
      if (!conversationId || !trimmed) return;
      const conversation = await resolveConversation(conversationId, socket.user);
      if (!conversation) return;
      const message = await Message.create({ conversationId: conversation._id, senderId: socket.user._id, senderName: socket.user.fullName, text: trimmed });
      conversation.updatedAt = new Date(); await conversation.save();
      io.to(conversation._id.toString()).emit('receive_message', message);
      for (const id of conversation.userIds) if (id.toString() !== socket.user._id.toString()) await notifyUser(id, 'message', `${socket.user.fullName} sent you a message.`);
    } catch (err) { console.error('Socket message error:', err.message); }
  });
});

// --- Database Seed & Server Startup ---
// Imported records often label every "College" or "Institute" as University. Re-check each unclaimed, unverified
// imported school by its name, so a secondary school is listed as Secondary. Safe to run on every start.
async function fixImportedSchoolLevels() {
  const { classifyLevel } = require('./scripts/lib/levelClassifier');
  const cursor = School.find({ source: 'imported', verified: { $ne: true }, claimedBy: null }).select('name country type').cursor();
  const ops = []; let changed = 0;
  for await (const s of cursor) {
    const r = classifyLevel({ name: s.name, raw: s.type, country: s.country });
    // A name that does not settle it, but was labelled University by the importer in a country where
    // "college" usually means secondary, is moved to Secondary. Admins can correct any exception.
    const level = r.confident ? r.level : (r.ambiguous && s.type === 'University' ? 'Secondary' : s.type);
    if (level && level !== s.type) { ops.push({ updateOne: { filter: { _id: s._id }, update: { $set: { type: level } } } }); changed += 1; }
    if (ops.length >= 500) await School.bulkWrite(ops.splice(0));
  }
  if (ops.length) await School.bulkWrite(ops);
  if (changed) console.log(`Corrected the education level of ${changed} imported school(s).`);
}

async function migrateSchoolRecords() {
  // Upgrade schools saved before source/verificationStatus/geo existed. Idempotent.
  // Uses raw (lean) documents because Mongoose would otherwise apply the 'unverified' default on read.
  const legacy = await School.find({ verificationStatus: { $exists: false } }).lean();
  for (const doc of legacy) {
    const set = { verificationStatus: doc.verified ? 'verified' : 'unverified', source: doc.source || 'schulloop' };
    const lat = Number(doc.latitude), lng = Number(doc.longitude);
    if (doc.latitude != null && doc.longitude != null && Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)) {
      set.geo = { type: 'Point', coordinates: [lng, lat] };
    }
    await School.collection.updateOne({ _id: doc._id }, { $set: set });
  }
  if (legacy.length) console.log(`Migrated ${legacy.length} school record(s).`);
}

async function seedDefaultData() {
  await migrateSchoolRecords();
  const count = await School.countDocuments();
  if (count === 0) {
    await School.insertMany([
      {
        name: 'Lagos Heritage Academy',
        location: 'Lagos',
        latitude: 6.5244,
        longitude: 3.3792,
        type: 'Secondary',
        rating: 4.8,
        fees: 4200,
        verificationStatus: 'verified',
        source: 'schulloop',
        country: 'Nigeria', city: 'Lagos',
        founded: 1998,
        studentCount: 850,
        staffCount: 72,
        description: 'A modern secondary school focused on academic excellence, creativity, and leadership.',
        facilities: ['Science laboratories', 'Library', 'Sports centre', 'Computer lab'],
        imageUrl: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=1200&q=80',
      },
      {
        name: 'Accra International School',
        location: 'Accra',
        latitude: 5.6037,
        longitude: -0.1870,
        type: 'Primary',
        rating: 4.5,
        fees: 3100,
        verificationStatus: 'verified',
        source: 'schulloop',
        country: 'Ghana', city: 'Accra',
        founded: 2005,
        studentCount: 620,
        staffCount: 55,
        description: 'A nurturing primary school with a strong foundation in literacy, numeracy, and discovery.',
        facilities: ['Library', 'Arts studio', 'Playground', 'Health clinic'],
        imageUrl: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80',
      }
    ]);
  }
  const jobCount = await Job.countDocuments();
  if (jobCount === 0) {
    await Job.insertMany([
      { title: 'Science Teacher', company: 'Lagos Heritage Academy', location: 'Lagos', salary: '$2,000 - $3,000', jobType: 'Full-time', skills: ['Teaching', 'Science'] },
      { title: 'Frontend Developer', company: 'EduTech Africa', location: 'Accra', salary: '$3,000 - $4,500', jobType: 'Full-time', skills: ['React', 'JavaScript'] },
    ]);
  }
}

if (!MONGO_URI) {
  console.error('MONGO_URI is missing. Add it to backend/.env. Run npm start so the local .env helper can create it.');
  process.exit(1);
}
if (!JWT_SECRET || JWT_SECRET.length < 32 || /replace_with|change_me|development_secret/i.test(JWT_SECRET)) {
  console.error('JWT_SECRET is missing, too short, or still a placeholder. Set a unique random secret of at least 32 characters in backend/.env.');
  process.exit(1);
}

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB successfully.');
    logFeatureStatus();
    await migrateSchoolRecords();
    await fixImportedSchoolLevels().catch((e) => console.warn('School level fix skipped:', e.message));
    await movePublicVerificationDocsToPrivate().catch((e) => console.warn('Verification document migration skipped:', e.message));
    if (process.env.SEED_SAMPLE_DATA === 'true' && process.env.NODE_ENV !== 'production') {
      console.warn('SEED_SAMPLE_DATA is enabled: inserting illustrative sample records into this non-production database.');
      await seedDefaultData();
    }
    server.listen(PORT, () => {
      console.log(`Schulloop backend listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });