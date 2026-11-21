# SchulLoop public demo and staging guide

## Public demo (implemented in the app)

The Login screen links to **Explore SchulLoop demo**. `src/features/auth/DemoScreen.js` provides a no-account preview of:

- School search by text, education level, and manual location selection.
- Clearly labelled sample school records with sample verification states.
- Fictional student/graduate profiles and local-only simulated connections.
- Sample jobs/scholarships and local-only saved opportunities.
- A simulated administrative dashboard.
- Calls to action to create a real account or sign in.

The demo currently uses hard-coded sample data and React component state. It should remain independent of production API mutations. Do not connect demo actions to real school approvals, user accounts, messages, applications, payments, or production records. Keep sample labels visible.

## Staging environment (required before release)

Staging is a separate private environment for testing backend and integration workflows. It is not the same as the public demo. Configure it with a dedicated database and credentials; never point staging at the production database.

1. Create a separate MongoDB database/cluster for staging (for example, a database named `schulloop_staging`).
2. In `backend/.env` for the staging deployment, configure a staging-only `MONGO_URI`, a newly generated `JWT_SECRET`, and staging-only payment/webhook credentials. Disable payment processing or use the provider's test/sandbox mode.
3. Use a separate API base URL and separate storage bucket for staging uploads.
4. Populate staging only with clearly identified synthetic/test records or appropriately protected test data. Never copy production personal data into staging without an approved privacy-safe process.
5. Restrict staging access to the development/test team; do not index it publicly.
6. Test registration, login, school search and verification, messaging/privacy, job applications/employer permissions, admin permissions, error handling, backup and restore.
7. Confirm all environment variables and endpoints before deployment. Production and staging must not share database credentials, JWT secrets, payment secrets, or storage credentials.

## Secret handling

- Never commit or distribute `backend/.env` or root `.env` files.
- Keep only `.env.example` files with placeholder values in source archives.
- If a real credential has been exposed in a shared archive, rotate it before deploying.
- A `.gitignore` rule does not remove a secret from a ZIP that already contains it; inspect archive contents before sharing.

## Acceptance checklist

- [ ] A visitor can open the demo without signing in.
- [ ] Sample content is visibly labelled and does not claim to be real.
- [ ] Search filters and location selectors update the sample results correctly.
- [ ] Demo connection/save/admin-preview actions are local-only.
- [ ] Demo cannot approve a real school, message a real user, apply to a real job, or make a real payment.
- [ ] Sign-up and sign-in links lead to the real authentication screens.
- [ ] Staging backend uses a different database and credentials from production.
- [ ] Test records and production records remain separated.


## Safety fixes included in this audit

- Password-reset tokens are no longer printed to application logs. A real email delivery provider still needs to be configured for production password recovery.
- The backend rejects placeholder JWT secrets at startup. Generate a unique random secret of at least 32 characters in `backend/.env`.
- Illustrative school/job seed records are not inserted automatically on server startup. They are only seeded when `SEED_SAMPLE_DATA=true` and `NODE_ENV` is not `production`. Never enable this against a production database.
- The app no longer attempts to register `/sw.js`, which is not present in this project.

## Validation status

JavaScript backend files and JSON configuration were statically checked. Full dependency installation, Expo bundling, database integration, and end-to-end tests were not completed in the audit environment because npm registry access was unavailable. Run the install and test commands in an internet-connected development environment before deployment.
