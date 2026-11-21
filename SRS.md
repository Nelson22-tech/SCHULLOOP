# SchulLoop — Software Requirements Specification

**Version:** 3.2  
**Date:** 31 October 2026  
**Status:** Updated product requirements baseline; implementation status must be verified by testing.

## 1. Product vision
SchulLoop is one connected platform that supports people through school discovery, student connections, education, career development, jobs, freelancing, local services, and lifelong learning.

**Core principle: one account, one connected platform, multiple capabilities over time.** A user should not need to create a new account solely because they become a student, graduate, freelancer, service provider, or employer.

## 2. Product scope
The platform comprises:
- Global School Finder and school profiles.
- Student Connect, connections, community and messaging.
- Jobs & Opportunities as a single portal containing Jobs & Careers, Freelance Projects, Local Services, and Scholarships & Training.
- A lifelong profile containing education, qualifications, skills, work experience, career interests and optional additional capabilities.
- My Activities for saved schools, applications, proposals, projects, service requests and listings.
- Notifications, privacy controls, reporting, moderation and administrative tools.

Payment processing, escrow, payroll, and platform-held funds are out of scope unless separately approved and specified.

## 3. Users, accounts and permissions
### 3.1 Account and profile model
A user has one core account and can have multiple capabilities at once. The core account, profile sections, and permissions are separate concepts. Adding a capability must not overwrite the user's existing account identity or remove existing data.

Supported capabilities include school seeker, parent/guardian, student, graduate, job seeker, freelancer, service provider, employer/client, school representative, administrator and super administrator. Some capabilities require verification or age eligibility.

### 3.2 Progressive profile completion
Registration should request only essential information. Users may add education records, qualifications, skills, experience, portfolio and career goals as needed. Profile sections must have visibility controls; sensitive personal details must not become public by default.

### 3.3 Parent/guardian and minors
Where individual accounts are appropriate, children and guardians should have separate identities. A secure, permissioned guardian relationship must be established before guardian-specific access is granted. Child-safety, consent, age thresholds and applicable legal requirements must be defined before production release. A guardian must not automatically gain access to every private message or setting.

### 3.4 School representatives
Official school-management capabilities require verification and scoped permissions. A regular account must not automatically be able to edit an institution's official listing.

## 4. Navigation and user experience
Recommended main navigation: **Home, Explore, Connect, Activities, Profile**. Messages and notifications are accessible from the header or contextual screens. Do not place every feature as a separate bottom-navigation item.

Home uses a consistent blue-and-white SchulLoop layout while personalizing recommendations and shortcuts using permitted profile details, interests, saved items and activity. Users should be able to control personalization where appropriate.

The approved visual direction is the first blue-and-white interface reference: clean cards, clear category entry points, compact mobile layouts, consistent typography and accessible touch targets. Mockups are design references, not evidence of implemented functionality.

## 5. Functional requirements
### 5.1 Global School Finder
Users can search and filter school listings by available fields such as name, country, location, education level, school type and programme. School details may include location, programmes, description, contact information, images and verification status. Users can save schools and revisit them in My Activities. Verified and unverified information must be clearly distinguished.

### 5.2 Student Connect and messaging
Eligible users can discover profiles, connect with others, participate in supported communities and message permitted contacts. Provide block/report controls, moderation, privacy safeguards and age-appropriate communication rules. Connections and messages remain associated with the same account as a user's education or career status changes, subject to retention and deletion policies.

### 5.3 Jobs & Opportunities portal
Jobs, freelance projects, local services and scholarships/training are grouped under one Jobs & Opportunities destination. They retain distinct workflows and category filters. Users can track relevant applications, proposals, projects, requests and saved listings from My Activities.

### 5.4 Jobs & Careers
Support full-time, part-time, remote, hybrid, on-site, internship and graduate trainee listings where provided. Employers can maintain profiles and manage authorized listings. Job seekers can apply and track application status. Listings should have source/verification labels where available and reporting controls for suspicious content.

### 5.5 Freelance Projects
Users can activate a freelancer profile with skills, portfolio, availability and rates where applicable. Clients can post projects with descriptions, categories, requirements, budgets/pricing model and expected timing. Freelancers can submit proposals; project owners can review and select proposals. Project statuses should be clear and permission-checked. Payments and escrow are excluded unless separately approved.

### 5.6 Local Services
Eligible users can publish provider listings with category, service description, service area, pricing or quotation approach, availability and request/contact method. Customers can search by category/location and submit service requests. Providers can respond with questions or quotations. Reviews, if enabled, require moderation and eligibility rules. Integrated payments and complex booking are excluded unless separately approved.

### 5.7 Scholarships and training
Support scholarship, training, webinar and other approved learning opportunity listings. Show eligibility, deadlines, provider, delivery mode, description and application instructions when available. Users can save opportunities and track deadlines where supported.

### 5.8 My Journey and profile evolution
Users can add or update education records, qualifications, graduation status, skills, work experience, portfolio and career goals without creating another account. A person may be a student and freelancer simultaneously or become an employer later. Do not require all profile sections to be completed during registration.

### 5.9 My Activities, notifications and shared services
Provide a consolidated view of saved schools, job applications, freelance proposals/projects, service requests and published listings. Notifications cover relevant messages, application changes, proposals, requests, deadlines and security events. Shared messaging should label the context of each conversation.

### 5.10 Administration and moderation
Authorized administrators can manage users, school listings, opportunity listings, reports and verification requests. Support reporting, review queues, restriction/removal actions and audit logs for security-sensitive administrative changes. Apply least-privilege access.

## 6. Technical and data requirements
The known architecture is Expo/React Native frontend, Express backend and MongoDB/Mongoose. Inspect the repository and preserve the existing stack unless a documented reason requires a change. Enforce authorization on the server, not only in the UI.

Conceptual data entities include UserAccount, Profile, EducationRecord, Capability/Permission, School, SchoolRepresentative, GuardianRelationship, Connection, Conversation, Message, Opportunity, JobApplication, FreelancerProfile, Project, Proposal, ServiceProviderProfile, ServiceRequest, Scholarship/TrainingListing, SavedItem, Notification, Report and AuditEvent.

Schema changes require an appropriate migration/backfill strategy and must preserve existing account identifiers and relationships. Validate user input and uploaded files; avoid exposing private data or secrets in logs.

## 7. Non-functional requirements
- Security: authentication, server-side authorization, input validation, least privilege and secure account recovery.
- Privacy: data minimization, visibility controls, appropriate retention/deletion rules and child-safety protections.
- Reliability: loading, empty, success and error states; useful error logging without secrets.
- Accessibility: readable typography, adequate touch targets and support for device accessibility settings.
- Performance: pagination for large listings, sensible query limits and responsive search/navigation.
- Maintainability: reuse shared components and services; document API contracts and environment configuration.

## 8. Acceptance criteria
1. A user can add supported capabilities without creating a duplicate account.
2. Education and career details can evolve while the account identity remains stable.
3. Jobs, freelance projects, local services and scholarships are discoverable from one portal with distinct workflows.
4. Home keeps a consistent layout and provides relevant recommendations based on permitted data.
5. Users can search, view and save supported school listings.
6. Eligible users can connect and message under privacy and safety rules.
7. A client can post a freelance project and a freelancer can submit a proposal through the approved workflow.
8. A customer can find a service provider and submit a request.
9. Guardian relationships, verification and protected resources are enforced server-side.
10. Existing working features pass regression testing after changes.
11. Implemented screens are compared against the approved blue-and-white reference on supported devices.
12. No mockup or documentation claim is treated as proof of a working implementation without tests.

## 9. Implementation sequence
1. Audit current screens, routes, schemas, authentication and existing documentation.
2. Confirm account/profile/capability design, guardian rules and verification policies.
3. Align navigation, Home and profile sections.
4. Consolidate Jobs & Careers, Freelance Projects, Local Services and Scholarships under Jobs & Opportunities.
5. Connect shared activity, messaging, notification and listing workflows.
6. Run API, authorization, migration, visual and regression tests.
7. Document production configuration, backups, monitoring and known limitations.

## 10. Open decisions before production
- Applicable age limits and guardian consent requirements.
- Verification evidence/process for schools, employers and providers.
- Whether reviews are included in the first release.
- Whether payments are required in a later release.
- Message retention, blocking/reporting and contact visibility rules.
- Personalization signals and user controls.
- Confirmed implementation state after a full source-code and runtime audit.

## 11. Status interpretation
This SRS defines the intended v3.2 product behavior. Refer to `SRS_V3.2_GAP_AUDIT.md` and `IMPLEMENTATION_STATUS.md` for the current code-review findings. A route or screen being present does not by itself prove the full workflow works; runtime and integration testing are required.

## Appendix: core product rules
1. One person should not need a new account only because their life stage or capabilities change.
2. Capabilities may overlap.
3. Jobs, freelance projects, local services and scholarships share one portal but retain appropriate workflows.
4. Home uses a consistent layout with personalized content.
5. Mockups and requirements are not proof of implementation.
6. Inspect and preserve existing code and data before modifying architecture or schemas.
