# Preview-match UI update
All screens were rebuilt to follow the approved preview boards (finder 1-15, Student Connect 1-5, Student Portal 1-5, Job Portal 1-10).
- Shared kit: `src/shared/ui/kit.js` (blue headers, cards, chips, status pills, module bottom bars).
- Navigation: 4-tab bar (Home, Explore, Applications, Profile); Connect, Portal and Jobs open from Home with their own bottom bars. New splash screen first.
- New screens: Splash, Communities, CommunityDetail, Messages, GroupChat, StudentPortal, ApplicationDetails, PaymentReceipt, Documents, PaymentsManagement, JobSearch/Listings/Details/Apply, MyJobApplications, JobApplicationDetails, SavedJobs, JobMessages, JobProfile.
- Real data only for applications, payments, receipts, notifications, messages. Sample fallbacks (SAMPLE_*) only for schools, jobs and communities when the API is empty.
- Backend: /admissions/mine now also returns school verified/verificationStatus/imageUrl.
- NOT run on a device yet (no Expo build here): syntax and import/route checks pass; test on emulator and adjust spacing.
- No photos are bundled: placeholders are used where the boards show photos.

## v3.2 update (Freelance, Local Services, Scholarships, My Journey, new navigation)
- Main bar is now Home / Explore / Connect / Activities / Profile (SRS v3.2 §5). Explore groups Global School Finder, Jobs & Careers, Freelance Projects, Local Services, Scholarships & Training.
- Profile holds MY JOURNEY (personal info, education, qualifications, skills & experience, career progress) and ACCOUNT (profile & privacy, account security, notifications, additional capabilities). My Activities is the Activities tab.
- Uses the v3.2 backend routes already in backend/index.js (projects, proposals, freelancers, services, service requests, scholarships, saved items, capabilities, journey, activities summary).
- Fixed: apiService.request now prefixes relative paths ('/admissions/mine') with the API base URL; they previously failed.
- No payments/escrow/booking (out of scope per SRS). Not run on a device. Home does not yet read the personalization switch (key schulloop_personalization).
