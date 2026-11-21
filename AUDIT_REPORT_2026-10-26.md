# SchulLoop ZIP Audit Report — 26 October 2026

## Scope and limitations

Reviewed the full `SchulLoop_demo_staging_update.zip` file inventory, JavaScript source files, local import paths, JSON configuration, backend startup logic, demo screen/navigation, and environment templates. Backend syntax check (`npm test --prefix backend`) passed, local relative-import scan found no missing imports, and JSON configuration files parsed successfully. The JSX/TSX parser check found no syntax diagnostics for files with `.jsx`/`.tsx` extensions.

A full dependency install, Expo bundle/build, live MongoDB test, mobile-device test, and end-to-end acceptance suite could not be run because the npm registry was unreachable from the audit environment (`EAI_AGAIN`). Therefore this report does not claim runtime or production readiness.

## Findings fixed in this update

1. **Password reset token exposure (high):** backend logged password-reset tokens to stdout. Removed token logging. Production password recovery still needs a real email delivery provider; the current in-memory reset-token map is not durable across restarts and is not suitable for a multi-instance production deployment.
2. **Placeholder JWT secret accepted (high):** startup only checked secret length, so a placeholder from `.env.example` could pass. Startup now rejects common placeholder strings and requires a unique random secret of at least 32 characters.
3. **Sample school/job records automatically seeded into an empty database (high):** startup called `seedDefaultData()` unconditionally, creating illustrative records in the same database used by the real app. Startup now runs the migration separately and seeds illustrative data only when `SEED_SAMPLE_DATA=true` and `NODE_ENV !== 'production'`. Do not enable this flag against production data.
4. **Missing service worker registration target (low):** `App.jsx` attempted to register `/sw.js`, but no `sw.js` exists in the project. Removed the silent, ineffective registration attempt.

## Remaining issues / follow-up required

- **Dependency compatibility unresolved:** npm dependency resolution could not be completed because registry access failed. Run `npm install` from the project root and `npm install` from `backend`, then resolve any peer-dependency errors without defaulting to `--force`.
- **Production email not configured:** password-reset token delivery must be implemented using a trusted email provider before relying on account recovery in production.
- **Reset-token storage:** replace the in-memory `Map` with a hashed, expiring database record or another production-safe store; add rate limits and generic responses to reduce account enumeration risk.
- **CORS is permissive:** backend currently uses `app.use(cors())`. Configure an explicit allowlist of production web origins before public deployment.
- **API base URL defaults to localhost:** set `EXPO_PUBLIC_API_BASE_URL` for deployed/web/mobile environments; `localhost` is only suitable for local development and has special behavior on physical devices.
- **Demo isolation needs runtime proof:** demo interactions in `DemoScreen.js` are local state and display sample labels, but test the production database and all real API routes to confirm demo mode cannot mutate production records.
- **Acceptance tests are incomplete:** test school level filtering, global search, denied location permission, verification authorization, student privacy, employer application access, and demo isolation as specified in the SRS.
- **Placeholder EAS project ID:** `app.json` contains `REPLACE_WITH_YOUR_EAS_PROJECT_ID`; replace it before using EAS build/update workflows.

## Commands to run on the developer computer

From the project root:

```powershell
npm install
npm run lint
npx expo-doctor
npx expo start
```

From a second terminal:

```powershell
cd backend
npm install
npm test
npm start
```

Before `npm start`, configure `backend/.env` with a real local/cloud MongoDB URI and a unique random `JWT_SECRET` (at least 32 characters). Keep `.env` files private and never include them in shared ZIPs or source control.
