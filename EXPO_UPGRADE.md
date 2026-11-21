# Expo SDK 57 upgrade

SchulLoop now targets Expo SDK 57 / React Native 0.86 / React 19.2.3.

Expo recommends upgrading SDKs deliberately and then running `npx expo install --fix` followed by `npx expo-doctor`. The project intentionally does not ship a stale lockfile; regenerate it on the development machine.

## Install

```powershell
npm install
npx expo install --fix
npx expo-doctor
```

If Expo reports a package mismatch, accept the SDK-compatible version it proposes.

## Start

```powershell
npx expo start
```

## Push notifications

Remote push notifications require a development/release build, not Android Expo Go. Configure EAS and replace `REPLACE_WITH_YOUR_EAS_PROJECT_ID` in `app.json` after `eas init`.

## Payments

Set these in `backend/.env`:

```env
FLUTTERWAVE_SECRET_KEY=your_secret_key
FLUTTERWAVE_WEBHOOK_SECRET=your_webhook_secret
FLUTTERWAVE_REDIRECT_URL=https://your-domain.example/payment-complete
```

Never put the Flutterwave secret key in the Expo `.env` file.
