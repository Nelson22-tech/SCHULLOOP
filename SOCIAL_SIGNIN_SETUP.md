# Google & Apple sign-in setup

Both buttons need your backend to be reachable on a public **https** address (Google and Apple do not
accept a phone/LAN address as a redirect). Deploy the backend first (see GO_LIVE_CHECKLIST.md), or use a
tunnel such as ngrok while testing. Below, `https://api.example.com` stands for that address.

## How it works
- **Google:** the app opens `https://api.example.com/api/auth/google/start`, Google signs the user in and
  returns to `https://api.example.com/api/auth/google/callback`. The server verifies the user, then hands the
  app a one-time ticket which the app swaps for a normal session.
- **Apple:** the app opens Apple's sign-in page. Apple posts the result to
  `https://api.example.com/api/auth/apple/callback`, the server bounces it back to the app, and the app sends
  Apple's token to the backend for verification.

## Google
1. Google Cloud Console -> APIs & Services -> Credentials -> **Create credentials -> OAuth client ID -> Web application**.
2. **Authorized redirect URI:** `https://api.example.com/api/auth/google/callback` (exactly this).
3. Also fill in the OAuth consent screen (app name, support email). While it is in "Testing", add your own
   Google account under **Test users**. Press "Publish app" when you are ready for everyone.
4. `backend/.env`:
   ```
   GOOGLE_CLIENT_ID=<client id>
   GOOGLE_CLIENT_SECRET=<client secret>
   PUBLIC_API_URL=https://api.example.com
   ```
   No Google setting is needed in the app's own `.env`.

## Apple
(Requires a paid Apple Developer account, $99/year.)
1. Apple Developer -> Identifiers -> create a **Services ID** and enable Sign in with Apple.
2. Configure it: Domain = `api.example.com`, Return URL = `https://api.example.com/api/auth/apple/callback`.
3. App `.env`: `EXPO_PUBLIC_APPLE_CLIENT_ID=<services id>` and `EXPO_PUBLIC_API_BASE_URL=https://api.example.com/api`.
   `backend/.env`: `APPLE_CLIENT_ID=<services id>`.
4. If you do not have an Apple Developer account yet, leave Apple unset: the button then says it is not configured.

## Test
Restart the backend and run `npx expo start -c`. Tap "Continue with Google". If something is wrong, the app
shows the reason (for example a redirect-URI mismatch is shown by Google in the browser page).
