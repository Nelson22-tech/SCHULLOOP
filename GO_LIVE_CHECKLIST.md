# SchulLoop - go-live checklist

## 1. Backend (needs Node 18+ and a MongoDB)
- Free hosting that works: Render or Railway for the server, MongoDB Atlas (free) for the database.
- Environment variables (see backend/.env.example): `MONGO_URI`, `JWT_SECRET` (32+ random characters),
  `NODE_ENV=production`, `TRUST_PROXY=1`, `PUBLIC_API_URL=https://<your host>`.
- Start command: `npm start` in the backend folder. Check `https://<your host>/api/health` returns `ok`.
- Note: uploaded files (photos, verification documents) are stored on the server's disk. Free hosts wipe the disk
  on redeploy, so attach a persistent disk/volume (or move uploads to cloud storage) before real users arrive.

## 2. Create your admin account
`npm run create-admin` in the backend folder (prompts for details).

## 3. Email (needed for "Forgot password")
Forgot-password emails a 6-digit code. Choose one provider and put the key in backend/.env:
- **Brevo** (easiest, free 300 emails/day): create an account, verify your sender email address under
  Senders, create an API key. Set `BREVO_API_KEY`, `MAIL_FROM=<your verified sender email>`.
- **Resend**: set `RESEND_API_KEY`, `MAIL_FROM` (needs a verified domain to email anyone).
Without a key, the code is only printed in the server log (fine for development).

## 4. Sign-in with Google / Apple
See SOCIAL_SIGNIN_SETUP.md.

## 5. Payments (optional at first)
`FLUTTERWAVE_SECRET_KEY`, `FLUTTERWAVE_WEBHOOK_SECRET` in backend/.env, and set the webhook URL in your
Flutterwave dashboard to `https://<your host>/api/payments/flutterwave/webhook`. Without these, plans, school
fees and paid mentor lessons show a "payments unavailable" message while free features keep working.

## 6. The app
- App `.env`: `EXPO_PUBLIC_API_BASE_URL=https://<your host>/api`.
- Test with Expo Go (`npx expo start -c`), then build with EAS when ready: Android APK is free to build;
  App Store/TestFlight needs the Apple Developer account.

## 7. Before showing it to others
- Remove sample/demo schools you don't want shown (Admin -> School verification -> Delete / Make unverified).
- Create a real test student, a school admin and a mentor, and click through search, apply, message, book a lesson.
