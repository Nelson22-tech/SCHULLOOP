# SchulLoop - make it ready for real users (10-minute checklist)

When the backend starts it prints a **Feature check** listing what is configured and what is missing.
You can also open `http://<your-backend>/api/config-check` and look at `features`.

## 1. Forgot password (needs an email service)
1. Create a free Brevo account (https://www.brevo.com), verify your sender email, create an API key.
2. In `backend/.env`:
   ```
   BREVO_API_KEY=<key>
   MAIL_FROM=<the sender email you verified>
   MAIL_FROM_NAME=SchulLoop
   ```
3. Restart the backend. In the app: Login -> Forgot password -> enter your email -> the 6-digit code arrives
   by email (check spam) -> enter it with a new password.
   (Without a key, the code is only printed in the backend console. That is fine for testing, not for users.)

## 2. Google / Apple sign-in
Follow `SOCIAL_SIGNIN_SETUP.md`. Both need the backend on a public **https** address
(`PUBLIC_API_URL`), so Google/Apple will not work against `http://192.168.x.x` on your laptop.
For a quick test use a tunnel (for example ngrok) and set `EXPO_PUBLIC_API_BASE_URL` to its https address.

## 3. Payments (lessons, plans, fees)
Set `FLUTTERWAVE_SECRET_KEY` and `FLUTTERWAVE_WEBHOOK_SECRET` in `backend/.env`.

## 4. Before inviting people
- Host the backend and MongoDB online (see `GO_LIVE_CHECKLIST.md`); set `TRUST_PROXY=1` when behind a host proxy.
- Create an admin account: `npm run create-admin` in `backend/`.
- Remove sample schools you do not want public (Admin dashboard -> School verification -> Delete / Make unverified).
