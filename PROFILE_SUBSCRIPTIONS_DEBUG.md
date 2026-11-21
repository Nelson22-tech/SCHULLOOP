# SchulLoop profile, subscriptions, and payment debug notes

## Changes made

- Added authenticated `GET /api/profile/me` and `PUT /api/profile/me` routes.
- Added `country` and `studyGoal` to the user model and public profile response. Profile updates use an explicit allowlist and cannot change email, role, password, account status, or permissions.
- Connected the mobile profile form to the API and local auth state. The email is displayed read-only because changing account email needs a separate verification workflow.
- Added server-owned subscription plan catalogue, authenticated subscription history/status, checkout creation, and provider verification routes.
- Added manual-renewal subscription records with pending/active/failed status and a 30-day access window after successful verification. Clients cannot set the plan price or mark a subscription paid.
- Added student/graduate, school, and employer account types to signup so each eligible plan has an account audience.
- Connected the plans screen to server prices, Flutterwave checkout, return URL parsing, verification, status refresh, and subscription history.
- Connected the school-fee payment screen to a return URL and provider verification. It no longer treats simply opening checkout as payment success.
- Tightened school-payment verification to check transaction reference, amount, and currency, and require a configured webhook secret rather than accepting unauthenticated webhook calls.
- Added subscription activation handling to the verified Flutterwave webhook path.

## Static checks completed

- `node --check backend/index.js`: passed.
- TypeScript transpile/parser check across 64 frontend source files: passed with zero syntax errors.
- ZIP integrity check: passed.

## Required before real payment testing

1. Create `backend/.env` from `backend/.env.example`.
2. Set `MONGO_URI` to a running MongoDB database.
3. Set `JWT_SECRET` to a unique random value of at least 32 characters; do not use the example placeholder.
4. Set a valid Flutterwave test secret in `FLUTTERWAVE_SECRET_KEY`.
5. Set a strong Flutterwave webhook hash in `FLUTTERWAVE_WEBHOOK_SECRET` and configure the same value in the Flutterwave dashboard.
6. Confirm the app's `schulloop://subscription-payment` and `schulloop://payment-result` return URLs are accepted by the chosen Flutterwave account/environment. If Flutterwave requires a public HTTPS callback for the account, configure an HTTPS callback and route its transaction ID back into the app.
7. Configure `EXPO_PUBLIC_API_BASE_URL` to a backend address reachable from the test phone. `localhost` on a physical phone is not the computer running the backend.

## Validation boundary

This environment did not have project dependencies installed, a running MongoDB instance, or Flutterwave credentials/network access. Therefore this is a static-code debug pass, not an end-to-end runtime test. Do not treat payments as launch-ready until test-mode checkout, successful verification, rejected/mismatched transaction tests, webhook signature tests, and receipt download are exercised against the actual configured services.

## Preview/backend alignment

The preview screens are front-end presentation; they are not a backend specification. The profile screen now persists supported fields. The subscription plans screen now reads server plan data and has backend checkout/verification/status routes. Admissions and payments continue to use their separate records: an admission confirmation is not a payment receipt. Backend endpoints for the dashboard, schools, admissions, notifications, payments, and admin payments exist in this project. Pixel-perfect visual parity and all user journeys still require a device/browser screenshot comparison and end-to-end testing.
