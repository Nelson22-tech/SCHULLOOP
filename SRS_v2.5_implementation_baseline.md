# Software Requirements Specification (SRS)
## Global School Finder (Schulloop) - Cross-Platform School Discovery Application

**Version:** 2.5.0
**Date:** October 2026
**Status:** Active Development

---

## Document Conventions

- **MUST** - Mandatory requirement
- **SHOULD** - Highly recommended
- **MAY** - Optional feature
- FR-X.X - Functional Requirement identifier
- NFR-X.X - Non-Functional Requirement identifier
- **[Implemented]** - Exists and works in the current codebase
- **[Partial]** - Some of the requirement exists; the rest does not yet
- **[Planned]** - Not built yet; describes intended future work

This version replaces v1.0. v1.0 described several integrations (Firebase Authentication,
Firebase Realtime Database, direct Flutterwave API calls, Google Maps) that were never actually
built. This version corrects that: every requirement below is tagged with its real status, based
on the code as it exists today, not on the original plan.

---

## Table of Contents
1. [Introduction](#1-introduction)
2. [Overall Description](#2-overall-description)
3. [Functional Requirements](#3-functional-requirements)
4. [Non-Functional Requirements](#4-non-functional-requirements)
5. [System Architecture](#5-system-architecture)
6. [External Interfaces](#6-external-interfaces)
7. [Data Requirements](#7-data-requirements)
8. [Security Requirements](#8-security-requirements)
9. [Assumptions and Constraints](#9-assumptions-and-constraints)
10. [Appendices](#10-appendices)

---

## 1. Introduction

### 1.1 Purpose
This document defines what Schulloop (Global School Finder) actually does today, and what it is
still meant to do. It exists so that anyone picking up the project - a new developer, a
contractor, an investor's technical reviewer - can tell, requirement by requirement, what is real
and what is still a plan.

### 1.2 Scope
Schulloop is a single Expo/React Native codebase that runs as:
- A mobile app (iOS and Android)
- A web app (React Native Web, currently served at `localhost:8081`/`8082` in development)

It is backed by one Node.js/Express API with a MongoDB database. There is no separate
microservice architecture; all backend logic lives in a single `backend/index.js` process today.

### 1.3 What changed since v1.0
- Corrected the technology stack to match what is actually implemented (Section 5).
- Added Section 3.8: **Student & Alumni Network** (the LinkedIn-style module), replacing the
  vaguer "Graduate Talent Portal" description with a fuller, comparable-to-LinkedIn spec.
- Added Section 4.9: **Appearance - Light and Dark Mode**, a new requirement; not yet built.
- Added Section 3.9: **Global School Data & Import Pipeline**, documenting the OpenStreetMap-based
  import tooling built for this project, which was not part of the original scope.
- Added Section 3.10: **Localization**, documenting the multi-language system now partially built.
- Removed claims of Firebase, Flutterwave, and Google Maps integration that do not exist in code.

---

## 2. Overall Description

### 2.1 Product Vision
Schulloop helps people find schools worldwide, similarly to how a property or job search app
works: search or browse by location, see verified and unverified listings, and contact a school
once it is verified. Alongside this, it has a professional-networking layer for students and
graduates (Section 3.8), modeled on LinkedIn.

### 2.2 Key Features and Current Status
1. **School Discovery & Search** - global keyword search plus "schools near me" **[Implemented]**
2. **School Verification Workflow** - admin verifies claimed/submitted schools **[Implemented]**
3. **Global Data Import** - bulk-import schools from OpenStreetMap, country by country or worldwide **[Implemented]**
4. **Chat** - real-time messaging between users and verified schools, via Socket.IO **[Implemented]**
5. **Payments & Receipts** - payments are recorded and gated correctly; PDF receipts auto-generate on completion; the real gateway (Flutterwave) checkout and webhook verification are not yet connected **[Partial]**
6. **Admin Dashboard** - verification queue, claims queue, user list, platform analytics **[Implemented]**
7. **Student & Alumni Network** - LinkedIn-style profiles, connections, network feed, school communities, job board, employer workflow **[Partial]** (see Section 3.8)
8. **Multi-language UI** - 6 languages, applied to 2 of the app's ~15 screens so far **[Partial]**
9. **Light/Dark Mode** - not built; every screen currently uses one fixed color palette **[Planned]**
10. **Offline Support / PWA caching** - not built **[Planned]**

### 2.3 User Types
- **Visitor/Student/Parent** - searches and browses schools, can message a verified school
- **Graduate/Student (Network user)** - has a public profile, connects with other users, applies to jobs
- **Employer** - posts jobs on the Talent tab
- **School Representative** - can claim a school listing
- **Platform Admin** - verifies schools and claims, manages users, sees analytics

---

## 3. Functional Requirements

### 3.1 School Discovery Module **[Implemented]**

#### FR-1.1: Global Keyword Search
- MUST let users search schools by name, city, region, or country, matched against the whole
  database - not limited to nearby results
- MUST debounce search input so requests are not sent on every keystroke
- SHOULD support filtering by school type (Nursery, Primary, Secondary, University)

#### FR-1.2: Location-Based Discovery
- MUST request the device/browser location and show the nearest schools first, worldwide, not
  capped to a fixed radius
- MUST fall back to showing all schools, with a clear message, if location is unavailable or
  denied
- MUST show each result's distance from the user when location is known

#### FR-1.3: School Profile Display
- MUST show a school's name, city, country, type, and verification status to everyone
- MUST restrict full profile details (contact info, fees, description, images) to **verified**
  schools only; unverified/imported schools show the basic fields only
- SHOULD show ratings/reviews once a review system exists **[Planned - no review data model yet]**

#### FR-1.4: Favorites
- SHOULD allow saving schools to a favorites list **[Planned - not yet in the codebase]**

### 3.2 School Verification & Claims Module **[Implemented]**

#### FR-2.1: Verification States
- Every school MUST have one verification state: `unverified`, `claimed`, or `verified`
- Schools imported in bulk (Section 3.9) MUST start as `unverified`
- A school representative MUST be able to submit a claim with supporting evidence
- An admin MUST be able to approve or reject a claim; rejecting MUST record a reason

#### FR-2.2: Access Gating by Verification
- MUST block starting a chat conversation with a school that is not `verified`
- MUST block creating a payment for a school that is not `verified`
- These checks MUST be enforced on the server, not only hidden in the UI

#### FR-2.3: Admin Review Queue
- MUST list schools with a pending claim, and separately, schools submitted directly (not
  imported), for the admin to verify or reject
- MUST show a live count of pending claims and pending verifications

### 3.3 Communication Module **[Implemented]**

#### FR-3.1: Real-Time Chat
- MUST use Socket.IO for real-time delivery **[Implemented - not Firebase, as v1.0 stated]**
- MUST persist conversations and messages in MongoDB
- MUST only allow starting a new conversation with a verified school (FR-2.2)
- SHOULD show typing indicators **[Planned]**
- SHOULD show read receipts (message seen/unseen status) **[Planned]**
- SHOULD let a user archive a conversation without deleting it **[Planned]**
- SHOULD let a user search within their own conversation history **[Planned]**
- Note: all chat today is user-to-school (FR-2.2). Direct user-to-user messaging (e.g., between
  two connections in Section 3.8) does not exist yet - this is a separate, larger gap, not just
  a missing feature toggle; see Section 3.8's notes.

#### FR-3.2: Notifications
- MUST show in-app notifications for relevant events (e.g., a saved school becomes verified, a
  connection request arrives)
- SHOULD support push notifications **[Planned - requires a push provider, none configured yet]**

### 3.4 Payment Module **[Partial - corrected, more is built than v2.0's first draft stated]**

#### FR-4.1: Payment Recording **[Implemented]**
- MUST create a payment record (amount, method, status, reference) tied to a user and a verified
  school
- MUST NOT accept or store raw card or mobile-money credentials in this API or database
- MUST reject a payment for a school that is not verified (enforced server-side, FR-2.2)

#### FR-4.2: Payment Status Control **[Partial]**
- MUST prevent a normal user from marking their own payment as completed - a user may only set
  their own payment to `pending`; only an admin can set `completed`/`failed`/`cancelled`
  **[Implemented]**
- MUST have the server verify the payment provider's own transaction/webhook callback before
  marking a payment completed **[Planned - not implemented]**. Today, "verification" is an admin
  manually changing the status in the database; there is no webhook endpoint and no call to
  Flutterwave or any other gateway at all yet. This is the actual gap - the rule that end users
  can't self-mark payments is satisfied, but the rule that the *server* verifies the *provider's*
  callback is not, because no provider is connected.
- Client requirement specifies **Flutterwave** as the gateway (or another approved gateway) -
  this is the named target, not an open choice as v2.0's first draft implied.

#### FR-4.3: Payment Gateway Integration **[Planned]**
- MUST integrate Flutterwave (or another approved gateway) so that: (a) the client initiates a
  real checkout using `payment.reference`, (b) the gateway calls back to a new server-side
  webhook route, (c) that route verifies the callback's authenticity (signature/secret check) and
  only then sets the payment to `completed`
- MUST redirect raw payment data collection to the gateway's own hosted fields/SDK, never through
  this app's own servers, once integrated
- SHOULD support controlled retry and cancellation of a pending payment

#### FR-4.4: PDF Receipt Management **[Implemented, more than initially documented]**
- MUST generate a unique, numbered PDF receipt automatically once a payment reaches `completed`
  status **[Implemented]** - the receipt includes the receipt number, transaction reference,
  date/time, payer name and email, school name and location, fee description, amount, currency,
  payment method, and a "PAID" status line
- MUST NEVER generate or serve a receipt for a payment that is not `completed` **[Implemented]** -
  both the download route and the receipt-info route return an error (409) rather than a receipt
  for any other status
- MUST restrict receipt access to the paying user or an admin **[Implemented]**
- MUST store receipt metadata (receipt number, amounts, references, the PDF's file path) in its
  own database record, separate from the payment record **[Implemented]**
- MUST provide a **View/Download** action **[Implemented - download only today]**
- SHOULD provide a **Share** action (the device's native share sheet, not just a download)
  **[Planned - not implemented in the app UI]**
- SHOULD embed an optional QR code or verification reference on the receipt for quick lookup
  **[Planned - not implemented]**
- SHOULD provide a dedicated admin view listing/searching all receipts, not just per-payment
  access **[Planned]** - an admin can already open any individual user's receipt, but there is no
  "all receipts" admin screen yet

### 3.5 Admin Dashboard Module **[Implemented]**

#### FR-5.1: Platform Analytics
- MUST show total users, total/verified school counts, applications, payments, messages,
  connections, imported-school count, and pending-claims count

#### FR-5.2: User Management
- MUST list registered users with name, email, and role
- SHOULD support suspending or removing a user account **[Planned]**

#### FR-5.3: School Management **[Implemented]**
- MUST list schools needing verification and schools with pending claims, each actionable
  (verify/reject) directly from the dashboard. This list deliberately EXCLUDES bulk-imported
  schools (Section 3.9) - with a single country import easily reaching several thousand schools,
  listing all of them here isn't practical, and almost none of them need an admin's attention
  individually; verification for those happens when a school representative claims one (FR-2.1)
- MUST let an admin search for and directly verify ANY school by name, city, or country - this is
  the only way to verify a bulk-imported school before it's been claimed by anyone, since it
  won't appear in the main pending list above for the reason noted above

### 3.6 Authentication and Authorization **[Implemented, corrected from v1.0]**

#### FR-6.1: Authentication
- MUST support email/password registration and login
- MUST hash passwords before storage (bcrypt)
- MUST issue a JWT on login, used to authenticate subsequent requests
- Session tokens MUST be rejected by the server once invalid/expired; the client MUST detect this
  and return the user to the login screen rather than showing a broken/empty page
- Social login (Google/Facebook) is **[Planned]**, not implemented

#### FR-6.2: Authorization **[Implemented]**
- MUST implement role-based access: `student`/`parent`/`graduate`/`employer` (ordinary users),
  `admin`, and `super_admin` determine which API routes and screens are available
- Admin-only routes (verification, claims, analytics, user list) MUST reject non-admin tokens on
  the server, not just hide the UI. Both `admin` and `super_admin` satisfy this check -
  `super_admin` has every regular admin capability, plus FR-6.3

#### FR-6.3: Admin Role Hierarchy **[Implemented]**
- MUST reserve the ability to promote a user to `admin`, or remove `admin` access from one, to the
  `super_admin` tier only - a regular `admin` cannot create or demote other admins
- MUST prevent any role change from being made to or by a user acting on themselves (no
  self-promotion, no accidental self-lockout)
- MUST NOT allow a `super_admin` to be created through the app itself, by anyone, including an
  existing `super_admin` - a `super_admin` account can only be provisioned by running a script
  directly against the database (`create-admin.js` with `ADMIN_ROLE=super_admin`). This is a
  deliberate choice: it means a single compromised `super_admin` session cannot silently mint
  more `super_admin` peers through the UI - doing so always leaves an out-of-band, auditable trail
  (direct database/server access), not just an API call.

### 3.7 Global Search Requirements **[Implemented]**
(Consolidated here from v1.0's scattered mentions - see also 3.1)
- MUST NOT be limited to a single country or continent; any school in the database, from any
  country, MUST be findable by keyword search
- "Near me" and "search anywhere" MUST be two distinct, both-available ways to find a school, not
  a single mixed mode

### 3.8 Student & Alumni Network - "Connect" and "Talent" (LinkedIn-style) **[Partial]**

This is content item 6 referenced by the client: the Connect + Talent modules together, designed
to work the way LinkedIn does - a public professional profile, a connection graph, and a job
board tied to that identity. Below, each part is marked with what already exists versus what a
LinkedIn-equivalent still needs.

#### FR-8.1: Public Profile **[Partial]**
- MUST let a user set a full name, a short bio, and a list of skills **[Implemented]**
- MUST let a user set a profile photo (by URL) **[Implemented]**
- MUST let a user record multiple education entries (school, degree, field, years), optionally
  linked to one of this platform's own School records **[Implemented]**
- MUST let a user record multiple work/internship experience entries **[Implemented]**
- MUST let a user list certificates or supporting documents **[Planned - not implemented; no file
  field or model exists for this yet]**
- MUST let a user record interests/passions, separate from professional skills **[Planned - not
  implemented; today only `skills` exists, with no separate interests field]**
- MUST let visible profiles be found by keyword search (name/skill), not only browsed as a plain
  or suggested list **[Planned - the discover/suggestions list exists (FR-8.2 note below) but has
  no search box yet]**
- SHOULD add, to reach LinkedIn-equivalence **[Planned]**:
  - Uploading a photo/document directly (today, avatar is a pasted URL - there is no file upload
    feature in this app for any content type)
  - A public profile URL that can be viewed without logging in at all (today, viewing a profile
    still requires being signed in to this app, even though the API technically allows an
    unauthenticated request through)

#### FR-8.2: Connections **[Partial]**
- MUST let a user send a connection request to another user **[Implemented]**
- MUST let the recipient accept or reject a request **[Implemented]**
- MUST show only mutually-accepted connections as "connected" **[Implemented]**
- SHOULD add, to reach LinkedIn-equivalence **[Planned]**:
  - A visible connection count and connection list on a profile
  - "People you may know" suggestions (e.g., same school, mutual connections)
  - A distinction between 1st-degree connections and everyone else, affecting what's visible

#### FR-8.3: Feed / Activity **[Implemented]**
- LinkedIn's core loop is a feed of posts from your network. Schulloop has no equivalent today.
- SHOULD let users post short updates (e.g., "graduated", "started at X") visible to their
  connections, as a first step toward a feed - this is a significant new feature, not a small
  addition, and should be scoped as its own project phase

#### FR-8.4: Job Board & Employer Workflow **[Implemented / Partial]**
- MUST list job openings with title, employer, location, salary range, type, and required skills
- MUST let a user apply, and track that application's status **[Implemented]**
- SHOULD recommend jobs based on the user's listed skills **[Planned]**
- SHOULD let an employer message an applicant directly, reusing the Chat module (3.3) **[Planned]**
- Employer accounts can publish job listings, view their own listings, view applicants for each listing, and update application status **[Implemented]**

#### FR-8.5: Endorsements/Recommendations **[Implemented]**
- A connection MUST be able to endorse one of the user's listed skills, one endorsement per
  skill per endorser, only between accepted connections
- A connection MUST be able to write a short recommendation, visible on the recipient's profile

#### FR-8.6: Same-School Matching Requires a Verified School **[Implemented]**
- "People you may know" MUST rank users who share a school above others - but a shared school
  MUST only count when it is a **verified** school record with a matching `schoolId`, never a
  freely-typed school name. This closes an obvious gap: without this rule, anyone could type any
  school's name into their profile and falsely appear as a schoolmate of real students there.
- Discovery MUST include users from every school, not just the viewer's own - a shared verified
  school affects ranking (who appears first), never eligibility (who appears at all)

### 3.11 School Groups **[Implemented]**
(New in v2.1 - added at the client's request: each school's own verified representative can run
communities for their students, distinct from the platform-wide Connect network in Section 3.8.)

#### FR-11.1: Who Can Create a Group
- MUST restrict group creation to the specific user who claimed a school AND whose claim was
  verified by a platform admin (Section 3.2) - not the platform admin themselves, and not a
  school that is merely `claimed` and still pending review
- A school's groups MUST remain visible/joinable even to non-members, so students can discover
  and browse what a school offers before joining

#### FR-11.2: Group Types
Five types are supported today, chosen as the smallest set that covers what a school realistically
needs, while staying flexible (a name and description are always free text, so a school isn't
boxed in by the type alone):
- **Class** - a cohort/year group (e.g., "Class of 2027")
- **Club** - a society or interest group (e.g., "Debate Club")
- **Study** - a smaller, subject-focused study group
- **Announcements** - one-way: only the group's creator can post; members can only read. MUST be
  enforced server-side, not just hidden in the UI
- **Alumni** - for that specific school's own graduates, distinct from the platform-wide alumni
  network in Section 3.8

#### FR-11.3: Membership
- MUST let any user join or leave a group freely, with no approval step - a group is a community,
  not an identity or access-control boundary
- MUST prevent a group's creator from leaving their own group (they must delete it instead, which
  also removes its posts)

#### FR-11.4: Group Posts
- MUST scope a group's posts to its own members only - separate from the personal network feed in
  Section 3.8, which is scoped to a user's individual connections, not a school's members
- MUST enforce the Announcements one-way rule (FR-11.2) on both read and write

#### FR-11.5: Student Group Screens & Moderation **[Partial]**
- No screen exists yet for any of this - Section 3.11 is backend-only so far, same situation the
  Feed (Section 3.8) was in before this revision
- No moderation tools (removing a member, editing/deleting a single post) exist yet
- No notification is sent when a new group is created at a user's school, or when a new
  announcement is posted - a student has to open the group to see it

### 3.9 Global School Data & Import Pipeline **[Implemented]**
(New in v2.0 - this tooling did not exist in v1.0 and was not part of the original scope.)

#### FR-9.1: Country-by-Country Import
- MUST be able to download a given country's schools from OpenStreetMap and convert them into the
  platform's school record format
- MUST label every imported record's likely level (Nursery/Primary/Secondary/University) from its
  name and tags, with a fallback of "Other" when it cannot tell

#### FR-9.2: Worldwide Import
- MUST be able to run the above for a list of countries in one operation, continuing past any
  single country's failure rather than stopping the whole run
- MUST report, per country, whether it succeeded, found nothing, or failed, and MUST provide a
  ready-to-run command to retry only the failed ones

#### FR-9.3: Re-import Safety
- Re-running an import with the same source data MUST update existing unverified records rather
  than duplicating them
- MUST NEVER overwrite a school that has been claimed or verified
- MUST be able to import already-downloaded files without re-fetching from the network

### 3.10 Localization **[Partial]**
(New in v2.0 - replaces v1.0's vague "SHOULD support multiple languages" with what's actually built.)

#### FR-10.1: Language Infrastructure
- MUST auto-detect the device's language on first launch and fall back to English if unsupported
- MUST let the user change language manually, with the choice remembered afterward
- MUST support right-to-left languages (Arabic today) including automatic layout direction
- Currently ships 6 languages: English, French, Spanish, Portuguese, Arabic, Swahili
  **[Implemented for these 6; adding more is a translation task, not a code change]**

#### FR-10.2: Translation Coverage
- MUST eventually cover every screen's user-facing text
- Currently covers: Login, Signup, Settings **[Partial - most screens still hardcoded in English]**

---

## 4. Non-Functional Requirements

### 4.1 Performance
- Search results SHOULD return within 2 seconds on a typical connection **[Not load-tested]**
- Nearby search MUST return the closest schools first, ordered by actual distance, not by an
  arbitrary or verification-based priority

### 4.2 Scalability
- The current single-process backend **[Implemented as a single Node process]**; horizontal
  scaling, load balancing, and database sharding are **[Planned]**, not built or needed at current
  scale

### 4.3 Availability and Reliability
- No uptime target has been set or measured yet; the app runs in local development today
  **[Planned once deployed]**

### 4.4 Compatibility
- MUST run on iOS, Android, and modern desktop browsers via Expo/React Native Web
  **[Implemented]**
- Exact minimum OS/browser versions have not been formally tested and should be defined before
  a production release

### 4.5 Usability
- MUST provide clear empty-state messaging instead of a blank screen when a list has no data
  **[Implemented for Connect and Admin screens; other screens should be checked]**
- MUST clearly distinguish a loading state, an error state, and a genuinely empty result

### 4.6 Accessibility
- SHOULD meet WCAG 2.1 AA color contrast - this directly affects Section 4.9 (dark mode): both
  the light and dark palettes MUST independently meet contrast requirements, not just the
  current single palette

### 4.7 Maintainability
- Shared logic (e.g., school-record parsing, used by two separate import scripts) MUST live in
  one shared module, not be duplicated per script **[Implemented for the import scripts]**
- SHOULD have automated tests **[Planned - no test suite currently exists]**

### 4.8 Data Provenance and Licensing
- Schools imported from OpenStreetMap MUST be attributed ("(c) OpenStreetMap contributors, ODbL")
  visibly in the app (e.g., Settings or an About screen) **[Planned - tooling exists, in-app
  credit line does not yet]**

### 4.9 Appearance - Light and Dark Mode **[Planned - new requirement]**

This is the feature the client explicitly asked to add. Nothing below exists yet; the app
currently renders every screen with one fixed set of hardcoded colors (navy `#173F5F`, cream
`#F4F1EA`, etc.), defined separately inside each screen's `StyleSheet.create()` call.

#### NFR-9.1: Theme Modes
- MUST support three modes: **Light**, **Dark**, and **System** (follows the device's OS setting)
- MUST default to **System** on first launch
- MUST let the user override this in Settings, next to the language picker (Section 3.10), and
  remember the choice the same way the language choice is remembered

#### NFR-9.2: Consistent Application
- MUST apply the chosen theme to every screen - not just some. Today's color values are
  hardcoded per-screen; this requires introducing a shared color-token system (e.g., a
  `background`, `surface`, `text`, `accent`, `border` token set) that every screen reads from,
  instead of each screen defining its own literal hex values
- MUST switch instantly, without needing an app restart (unlike the right-to-left language switch
  in Section 3.10, which does need one)

#### NFR-9.3: Contrast and Readability
- Both the light and dark palettes MUST independently meet WCAG 2.1 AA contrast ratios (4.5:1 for
  normal text) - a dark palette is not just "invert the colors," since that alone commonly fails
  contrast checks (e.g., pure white text on pure black, or a bright accent color that works on
  light but not dark)
- Status colors (verified/green, unverified/orange, error/red, etc.) MUST remain distinguishable
  and meet contrast in both modes, not just re-use the light-mode values unchanged

#### NFR-9.4: Implementation Notes (non-binding, for whoever builds this)
- The cleanest path is a small `ThemeContext` (mirroring the existing `AuthContext` pattern already
  in the codebase) that exposes the current token set, backed by `AsyncStorage` for persistence and
  `Appearance.getColorScheme()`/`useColorScheme()` from React Native for the "System" mode
- This should be scoped as its own project phase, similar in size to the localization work in
  Section 3.10 - every screen's `StyleSheet` needs to be touched, not just a few

---

## 5. System Architecture (corrected to match the actual codebase)

### 5.1 High-Level Architecture
```
+-----------------------------------------------------------------+
|                     Client (single codebase)                    |
|   Expo / React Native  ->  iOS app, Android app, Web (RN-Web)   |
+-----------------------------------------------------------------+
                              | REST API (JSON) + Socket.IO
+-----------------------------------------------------------------+
|                  Backend: one Node.js/Express process           |
|   Auth (JWT+bcrypt) | Schools | Chat (Socket.IO) | Payments     |
|   Admin/Verification | Claims | Connect | Talent/Jobs           |
+-----------------------------------------------------------------+
                              |
+-----------------------------------------------------------------+
|                      MongoDB (single database)                  |
|   Users, Schools (2dsphere geo index), Conversations, Messages, |
|   Payments, ConnectionRequests, Jobs, Applications, Claims      |
+-----------------------------------------------------------------+

Offline tooling (not part of the running app's request path):
  scripts/import-world.js, import-folder.js, osm-to-csv.js
  -> fetch/convert OpenStreetMap data -> write into the same MongoDB
```

### 5.2 Technology Stack (as actually used)
- **Frontend:** React Native + Expo (SDK 54), React Navigation, i18next/react-i18next for
  localization
- **Backend:** Node.js, Express
- **Database:** MongoDB (via Mongoose), with a 2dsphere geospatial index for nearby search
- **Real-time:** Socket.IO (not Firebase)
- **Auth:** JSON Web Tokens + bcrypt, issued and verified by this app's own backend (not Firebase
  Auth, not OAuth, today)
- **Payments:** Records only; no gateway integrated yet (Section 3.4)
- **Location:** Browser/device Geolocation API + MongoDB geospatial queries (not Google Maps API)
- **Data import:** Node scripts calling the public OpenStreetMap Overpass API

---

## 6. External Interfaces

### 6.1 OpenStreetMap Overpass API **[Implemented]**
- Used only by the offline import scripts (Section 3.9), not by the running app itself
- Two mirrors are used, with a fallback if the primary is unreachable
- Subject to OpenStreetMap's fair-use rate limits; the import tooling deliberately waits between
  requests to respect this

### 6.2 Device/Browser Geolocation **[Implemented]**
- Used for "schools near me" (FR-1.2); requires the user to grant location permission

### 6.3 Payment Gateway **[Planned]**
- No gateway is connected today. Once chosen (Section 3.4), it MUST be integrated via that
  provider's own hosted checkout/SDK, never handling raw card data on this app's servers.

### 6.4 Push Notification Service **[Planned]**
- Not yet integrated. Would require choosing a provider (Expo push notifications is the natural
  default, given the Expo-based stack) before FR-3.2's push requirement can be met.

---

## 7. Data Requirements

### 7.1 User Data **[Implemented]**
- Name, email, hashed password, role, profile bio/skills (for Section 3.8)

### 7.2 School Data **[Implemented]**
- Name, location (with geo coordinates), country/region/city, type, verification status, source
  (platform-submitted vs. imported), external ID (for imported records), and, once verified: fees,
  description, contact info, images

### 7.3 Connection & Job Data **[Implemented]**
- Connection requests (from/to user, status), job listings, job applications (with status)

### 7.4 Chat Data **[Implemented]**
- Conversations (participants, school reference) and messages (sender, text, timestamp)

### 7.5 Payment Data **[Partial]**
- Amount, method, status, reference, linked user and school; no card/mobile-money credentials are
  ever stored (FR-4.1)

### 7.6 Data Retention **[Planned]**
- No retention policy is enforced in code today. v1.0's specific retention periods (2 years for
  chat, 7 years for transactions, etc.) were aspirational and are not implemented; a real policy
  should be defined and enforced before handling real user data at scale.

---

## 8. Security Requirements

### 8.1 Data in Transit **[Depends on deployment]**
- MUST be served over HTTPS/WSS in any real deployment; local development currently runs over
  plain HTTP, which is expected for development but MUST NOT be used for a live deployment

### 8.2 Authentication Security **[Implemented, partially]**
- Passwords MUST be hashed with bcrypt before storage **[Implemented]**
- MUST enforce a minimum password strength **[Partial - basic length check only; should be
  reviewed]**
- Expired/invalid tokens MUST be rejected server-side and MUST cause the client to sign the user
  out cleanly (Section 3.6) **[Implemented]**

### 8.3 Payment Security **[Not yet applicable]**
- Since no real gateway is integrated (Section 3.4), PCI DSS compliance is not yet applicable.
  It becomes a hard requirement the moment a real gateway is integrated - raw card data MUST
  never pass through or be logged by this app's own servers.

### 8.4 Authorization Enforcement **[Implemented]**
- Every admin-only action (verify school, approve/reject claim, view analytics, list users) MUST
  be checked server-side by role, not only hidden in the UI (FR-6.2)
- Chat and payments MUST be blocked server-side for unverified schools (FR-2.2), not only
  prevented by the UI

### 8.5 API Security **[Partial]**
- MUST validate request inputs (e.g., a payment's amount MUST be a positive number, a school ID
  MUST be a valid reference) **[Implemented for the routes reviewed]**
- Rate limiting, formal CORS configuration, and API versioning **[Planned - not yet implemented]**

---

## 9. Assumptions and Constraints

### 9.1 Assumptions
- Users have internet access for search, chat, and payments; a fully offline mode is not built
- OpenStreetMap's coverage varies by country and is never complete; imported data quality depends
  entirely on what volunteers have mapped
- The eventual choice of payment gateway will support the target regions' payment methods
  (mobile money is a priority given the project's Cameroon/West-Africa focus)

### 9.2 Constraints
- **Data quality:** No school data source is authoritative or complete; verification (Section 3.2)
  exists specifically because imported data cannot be trusted at face value
- **Third-party rate limits:** The Overpass API is a shared free resource; large imports MUST
  respect its fair-use limits (Section 6.1)
- **Single backend process:** Today's architecture is one Node process and one MongoDB instance;
  it has not been tested under significant concurrent load

### 9.3 Dependencies
- Node.js 18+ (required for built-in `fetch`, used by the import tooling)
- Expo SDK 54 and its matching native module versions
- MongoDB (any recent version supporting 2dsphere indexes)
- Overpass API availability, for the import tooling only (not for the running app)

---

## 10. Appendices

### A. Glossary
- **SRS:** Software Requirements Specification
- **JWT:** JSON Web Token
- **RBAC:** Role-Based Access Control
- **OSM:** OpenStreetMap
- **ODbL:** Open Database License (OpenStreetMap's data license)
- **WCAG:** Web Content Accessibility Guidelines
- **2dsphere:** MongoDB's geospatial index type, used for "nearest school" queries

### B. References
- React Native / Expo: https://docs.expo.dev
- Socket.IO: https://socket.io/docs
- OpenStreetMap Overpass API: https://wiki.openstreetmap.org/wiki/Overpass_API
- i18next: https://www.i18next.com
- WCAG 2.1: https://www.w3.org/WAI/WCAG21/quickref/

### C. Revision History
| Version | Date | Changes |
|---|---|---|
| 1.0 | June 2024 | Initial SRS. Described a Firebase/Flutterwave/Google-Maps architecture that was never actually built. |
| 2.0 | September 2026 | Rewritten against the actual codebase. Corrected the technology stack. Added Section 3.8 (LinkedIn-style Student & Alumni Network), Section 3.9 (global import pipeline), Section 3.10 (localization), and Section 4.9 (light/dark mode - new, not yet built). |
| 2.1 | September 2026 | Cross-checked against the client's original SRS (Sections 3.4-3.7). Corrected Section 3.4 (Payment Module): PDF receipt generation was undocumented as more complete than stated; real payment-gateway/webhook verification was undocumented as less complete than implied. Added certificates/documents, interests/passions, and profile search as explicit Planned items to Section 3.8. Added read receipts, conversation archive, and conversation search to Section 3.3. |
| 2.2 | September 2026 | Discovery (Section 3.8) now only treats a shared school as a match when it is a verified school record, not a typed name. Added Section 3.11: School Groups - a school's own verified representative can create class, club, study, announcements, and alumni groups. Backend only; no screen exists yet. |
| 2.3 | September 2026 | Added a `super_admin` role above `admin` (Section 3.6, FR-6.3): only a super_admin can promote/demote other admins; super_admin itself can only be provisioned via a direct database script, never through the app, even by another super_admin. |
| 2.4 | September 2026 | Clarified and fixed a real gap in Section 3.5: the admin dashboard's pending-schools list deliberately excludes bulk-imported schools (there can be thousands), which meant an admin had no way at all to find and verify one. Added search-by-name/city/country so any school, imported or not, can be found and verified directly. |
| 2.5 | October 2026 | Rebuilt the application UX around the documented platform structure: Student Connect now has a network feed, discovery, connections, requests and school-community entry points; Talent now has jobs, saved jobs, application tracking, career profile, employer dashboard, job posting, employer listings and applicant status management; Admin now has overview, school verification, users and moderation sections. Added employer job APIs and updated application-status authorization. |

---

**Document Status:** DRAFT - pending review after the October 2026 UX/backend structure rebuild
**Next Review:** Once Section 4.9 (theming), media-rich feed enhancements, employer messaging/interviews, and career-document uploads are scoped into development tickets.


## v2.6.0 Complete Implementation Update
The October 2026 implementation rebuild adds the previously planned cross-cutting features: persistent system/light/dark themes, six-language i18n foundation, authenticated rich-media feed with reactions/comments, career document management, employer interviews, push-token registration and server delivery, Flutterwave checkout/verification/webhook integration, PWA service-worker caching, and an Expo SDK 57 / React Native 0.86 dependency target. External credentials and production infrastructure remain deployment configuration rather than source-code requirements.
