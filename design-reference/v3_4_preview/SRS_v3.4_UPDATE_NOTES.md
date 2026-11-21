# SchulLoop — SRS v3.4 Preview Alignment Update Notes

**Baseline:** SRS v3.3 (as-built), dated 6 November 2026  
**Purpose:** Align the visual preview with the supplied screen references and record requirements that should be clarified before the next implementation release.

## 1. Visual direction confirmed by the supplied reference screens
- Blue-and-white visual system, rounded cards, clear typography and compact mobile layouts.
- Five-tab navigation from SRS v3.3: Home, Explore, Connect, Activities and Profile.
- School discovery, school detail, admissions, payment receipt, student profile, notifications, admin and subscription screens.
- Separate student-connect/community/messaging screens and job/career screens.
- Keep the role/capability model from v3.3: one account can gain capabilities without changing `userType`.

## 2. Recommended requirement updates for the next code release

These are recommendations, not claims that the current code already implements them.

### PR-2 / PR-3 — Nearby schools infinite feed
Retain the planned cursor/page-based API and infinite Home list. Make the ordering explicit:
1. Verified schools
2. Claimed schools
3. Unverified schools
4. Within each verification tier, nearest first

Avoid duplicates across pages. Include a stable cursor or page contract, loading state, retry state, empty state, and end-of-list state. Schools without coordinates should appear after geolocated schools when their city matches the user's saved/current city.

### PR-4 / PR-5 — Search ranking and tolerant matching
Specify the ranking order in one shared contract used by API tests and UI:
- Exact school name/acronym
- Name/acronym starts with query
- Contains query
- Verification tier
- School level match
- Distance band, when coordinates are available
- Rating
- Name as deterministic tie-breaker

Matching should be case-insensitive and accent-insensitive across school name, acronym, city, region, country and location. Ensure missing coordinates do not exclude otherwise valid text matches.

### PR-6 — Location fallback
When location permission is denied, unavailable or times out, use the saved profile city/country where available. Show a non-blocking explanation and keep the rest of Home usable.

### PR-7 — Appearance setting
SRS v3.3 says the appearance preference is saved but most screens remain fixed light mode. Do not present Dark mode as complete until shared components and the priority screens actually respond to the selected theme. Either implement it or temporarily hide/label the unfinished option.

### PR-1 — School level
Add the planned level enum and migration/backfill from existing `type`. Keep `type` and `level` distinct; expose level in school forms, details and filters. Add indexes and tests for the new field.

### Jobs & Opportunities
Keep jobs, freelance projects, local services, scholarships and training under one discovery entry point while preserving separate detail, application/proposal/request workflows. Add an end-to-end runtime test for each workflow.

## 3. Acceptance criteria to add or clarify
- **Nearby feed:** verify verified-first tier ordering and nearest-first order within each tier; load multiple pages and prove there are no duplicates.
- **Location fallback:** deny permission and verify saved city/country fallback; verify Home remains usable.
- **Search:** test exact, prefix, substring, mixed-case, accented and unaccented queries, including schools with no coordinates.
- **School level:** verify migration/backfill and filtering for every supported level.
- **Appearance:** test Light, Dark and System on Home, Search, School Detail, Profile and Admin before marking complete.
- **Unified opportunities:** independently test job application, freelance proposal, service request and scholarship save flows.

## 4. Resolve an acceptance-criteria inconsistency
SRS v3.3 AC-5 currently expects nearby schools to be sorted by distance, while PR-2 proposes verification tier first and distance within each tier. Update AC-5 to match PR-2 before implementation and QA sign-off. Suggested expected result:

> Nearby schools load in pages. Verified schools appear before claimed schools, which appear before unverified schools; within each tier, nearer schools appear first. Additional pages load without duplicates. If location is denied, the saved-city fallback is used where available.

## 5. Important implementation boundary
The supplied v3.3 PDF is an as-built specification and explicitly warns that screen presence does not prove end-to-end workflow completion. The screenshot ZIP says its images are crops from design boards, not captures from a running application. Keep UI reference approval, code implementation, and runtime acceptance testing as separate sign-off stages.

## 6. Files delivered
The accompanying `index.html` is a navigable screenshot-based visual preview. It does not replace the Expo app, API, database or payment integration. To patch the actual application and produce a runnable updated source ZIP, the current SchulLoop source-code ZIP is required.
