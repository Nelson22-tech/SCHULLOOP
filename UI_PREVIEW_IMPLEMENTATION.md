# SchulLoop preview implementation

This update turns the approved 15-screen blue/white/navy reference into real React Native navigation and screens, not a static image overlay.

## Implemented screen mapping

1. Splash — Expo native splash configuration/assets remain the app launch entry.
2. Login — existing login flow with updated SchulLoop branding.
3. Home dashboard — new dashboard, overview cards and quick actions.
4. Search & filters — existing global school finder and filter screen.
5. School details — existing school detail screen.
6. Admission application — existing form, blue styling adjustments and backend submission.
7. Application confirmation — new confirmation screen showing the unique application number and a clear distinction from an admission offer or receipt.
8. Application tracking — new My Applications screen using the authenticated `/admissions/mine` endpoint.
9. Payment — existing Flutterwave hosted checkout screen; card details are not collected in the app.
10. Payment receipt — existing backend-generated PDF receipt link, available only when payment status is completed.
11. Student profile — new profile presentation/edit form. The current backend does not yet expose a general student-profile update endpoint, so Save explicitly tells the user this action is not persisted yet.
12. Notifications — existing notifications screen.
13. Admin dashboard — existing administration dashboard.
14. Payments management — new admin dashboard tab backed by a new admin-only `/api/admin/payments` endpoint.
15. Subscription plans — new plans screen. Prices are explicitly illustrative; subscription checkout and entitlement activation are not yet connected.

## Security and limitations

- The new admin payments endpoint requires admin authentication and returns a limited, newest-first list.
- The generic payment-status endpoint no longer allows the client or admin UI to set a payment to `completed`; only the provider verification/webhook flow should do that. Receipts are generated after provider verification.
- Flutterwave credentials must remain in the backend `.env`; never put secret keys in Expo client variables.
- Manual subscription renewal remains the intended renewal model. Subscription plans in this update are presentation only, not a production billing system.
- This workspace has no installed `node_modules` and dependency installation could not be validated here. JavaScript syntax checks were run on changed files, but a full Expo build, device screenshot comparison, and end-to-end backend/payment tests have not been run. Do those before release.
