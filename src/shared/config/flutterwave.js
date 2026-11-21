// Flutterwave Payment Configuration
//
// IMPORTANT: Anything prefixed EXPO_PUBLIC_ is compiled into the client
// JS bundle and is readable by anyone who inspects the app. Only the
// publicKey belongs here. The secretKey and encryptionKey must live
// ONLY in the backend's environment (see backend/.env) and are used
// server-side when creating/verifying payments (see POST /api/payments
// and the payment webhook handler in backend/index.js). Never add a
// FLUTTERWAVE_SECRET_KEY or FLUTTERWAVE_ENCRYPTION_KEY variable with the
// EXPO_PUBLIC_ prefix.

export const flutterwaveConfig = {
  publicKey: process.env.EXPO_PUBLIC_FLUTTERWAVE_PUBLIC_KEY,
  baseUrl: 'https://api.flutterwave.com/v3',
};

// Payment types supported
export const PAYMENT_TYPES = {
  MOBILE_MONEY: 'mobile_money',
  CARD: 'card',
  BANK_TRANSFER: 'bank_transfer',
  USSD: 'ussd',
};

// Transaction status
export const TRANSACTION_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
};
