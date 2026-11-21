# SchulLoop v3.3 - local setup fixes

Changes since v3.2 (found while running the project on Windows):

1. package.json - nine Expo packages used version numbers that do not exist on npm
   (expo-constants, expo-haptics, expo-web-browser, expo-location, expo-image-picker,
   expo-document-picker, expo-notifications, expo-file-system, expo-updates).
   They now use the SDK 57 versions (~57.x). eslint, eslint-config-expo and the rest
   are unchanged from v3.2. Do NOT run `npm audit fix --force` - it downgrades these.
2. app.json - removed `experiments.typedRoutes`. It made Expo CLI look for
   `expo-router`, which this React Navigation project does not use
   (error: Cannot find module 'expo-router/_ctx-shared').
3. src/features/dashboard/DashboardScreen.js - new "Schools near you" section on the
   Home tab. Asks for location permission, calls getNearbySchools and lists the 6
   closest schools with distance, with status messages for denied / no data / far away.

Known gaps (not changed in this build):
- Appearance (Light/Dark/System) saves the choice but screens still use fixed light colours.
- Nearby list is not yet endless/verified-first; search does not rank by distance or level;
  there is no `level` field. A school only shows in search if it exists in your local
  MongoDB with its city/location filled in (e.g. city "Buea").

## Run it (Windows PowerShell)

Terminal 1 - backend:
    cd backend
    npm install
    copy .env.example .env          (then set JWT_SECRET, MONGO_URI=mongodb://127.0.0.1:27017/schulloop)
    npm start

Terminal 2 - admin account (once):
    cd backend
    $env:ADMIN_EMAIL="admin@schulloop.com"
    $env:ADMIN_PASSWORD="ChooseAStrongPass123"
    npm run create-admin

Terminal 3 - app (project root):
    copy .env.example .env
    npm install
    npx expo install --fix
    npx expo start -c

## Testing on a phone or emulator (package.json scripts)

    npm start               normal start, press c for the QR code
    npm run start:go        force Expo Go (use on iPhone / Android phone)
    npm run start:lan       same Wi-Fi or hotspot (default network mode)
    npm run start:tunnel    works even when Wi-Fi blocks devices (slower; uses @expo/ngrok)
    npm run start:clear     clear Metro cache, then start
    npm run android         open in an Android emulator (needs Android Studio + a virtual device)
    npm run ios             open in the iOS simulator (macOS only; on Windows use Expo Go on an iPhone)
    npm run build:android:preview   installable Android build via EAS (needs an Expo account)
    npm run build:ios:preview       installable iOS build via EAS (needs an Apple developer account)
    npm run build:dev:android / build:dev:ios   development builds (adds the dev client)

## Landing + admin design update
- assets/images/schulloop-logo-mark.png: redrawn logo (mortarboard over circular arrows) to match the approved design. Used on the landing screen and the admin sidebar.
- src/features/auth/SplashScreen.js: brighter blue gradient, larger logo, soft glow behind the globe, light status bar. The wordmark is spelled "SchulLoop" (the mockup image shows a typo, "SchlulLoop").
- src/features/admin/AdminDashboardScreen.js: the dark-blue sidebar (Dashboard, Users, Schools, Jobs, Applications, Payments, Subscriptions, Reports, Settings) now stays visible on phones as a compact column, as in the design. Stat cards stack their icon above the label on narrow screens. Full-width sidebar is unchanged on wide screens.
- Stat notes under the cards show real data (connections, verified schools, applications, revenue change), not the mockup's sample percentages.
- The app icon (assets/images/icon.png and the Android icon files) was not changed.

## School Administrator Portal (new)
Built from SchulLoop_School_Admin_Portal_Preview.zip. The v3.2 app had no school admin screens at all.

Frontend (src/features/schoolAdmin/): portalKit.js, sectionsA.js, sectionsB.js, SchoolAdminPortalScreen.js.
11 sections as in the preview: Dashboard, School profile, Pictures & gallery, Academics & facilities, Admissions,
Enquiries, Announcements, Verification, Staff access, Analytics, Settings. Wide screens use the 250px navy sidebar;
phones use the scrolling navy strip. Entry: Home tab and Profile tab, shown to accounts with userType "school".

Backend (backend/index.js): /api/school-admin/* endpoints. The school is derived from the signed-in user
(School.claimedBy, or an active staff membership) and never from a client-supplied id. Roles: owner, school_admin,
admissions_officer, communications_officer. New models: SchoolAnnouncement, SchoolEnquiry, SchoolStaff, SchoolEvent.
New School fields: ownership, motto, address, levels, programList, admission settings, gallery, verification documents.
Public additions: POST /api/schools/:id/enquiries, GET /api/schools/:id/announcements, POST /api/schools/:id/events.
serializeSchool() now strips verificationDocs from public responses.

How to test: sign up with the School role -> claim a school on its detail page -> log in as admin and approve the
claim (Admin Dashboard > Pending claims) -> log back in as the school user -> Home > School Admin Portal.

Not done / needs work before production:
- Not run against a live database in this build; backend syntax-checked only. Run the acceptance checks in the SRS.
- Images and verification documents are stored in the local /uploads folder (public URLs). Move to durable private
  object storage before production; verification documents must not be public.
- Verified schools cannot change their name from the portal (returns a "contact support" message); there is no
  review queue yet. The platform admin still verifies schools from the Admin Dashboard.
- The public school page does not yet show announcements/gallery or have a "Contact school" form
  (apiService.sendSchoolEnquiry / getSchoolPublicAnnouncements are ready for it).
- Staff invites need the invitee to already have a SchulLoop account with that email.
- No audit log yet (see INTEGRATION_PLAN.md in the preview zip).
