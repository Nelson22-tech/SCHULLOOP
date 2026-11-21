// Shared helpers for Scholarships & Training screens.
export const TYPE_LABELS = { scholarship: 'Scholarship', training: 'Training', webinar: 'Webinar', immigration: 'Immigration' };
// Shown on every Immigration listing: these programs attract scammers, so students are warned each time.
export const IMMIGRATION_WARNING = 'Entering is free. Use only the official government website. Never pay anyone to enter, to improve your chances, or to "win". Dates and eligibility change every year, so always check the official site.';
export const MODE_LABELS = { online: 'Online', in_person: 'In person', hybrid: 'Hybrid' };

// SAMPLE data: only shown when the API returns nothing or fails; labelled "Sample" in the UI.
export const SAMPLE_ITEMS = [
  { _id: 'sample-s1', sample: true, type: 'scholarship', level: 'Postgraduate', title: 'Mastercard Foundation Scholarship', provider: 'University of Cambridge', location: 'United Kingdom', mode: 'in_person', deadline: '2025-12-31', description: 'Sample listing: full funding for outstanding students.', eligibility: 'Sample eligibility.', applyUrl: '', source: 'Sample', verified: false },
  { _id: 'sample-s2', sample: true, type: 'scholarship', level: 'Undergraduate', title: 'Full Tuition Scholarship', provider: 'African Leadership Academy', location: 'South Africa', mode: 'in_person', deadline: '2026-01-15', description: 'Sample listing: tuition coverage for first-year students.', eligibility: 'Sample eligibility.', applyUrl: '', source: 'Sample', verified: false },
  { _id: 'sample-t1', sample: true, type: 'training', level: 'Other', title: 'Tech Skills Training Program', provider: 'Google Career Certificates', location: 'Online', mode: 'online', deadline: '2026-02-28', description: 'Sample listing: beginner-friendly career certificate.', eligibility: 'Open to all.', applyUrl: '', source: 'Sample', verified: false },
  { _id: 'sample-w1', sample: true, type: 'webinar', level: 'Other', title: 'Scholarship Application Masterclass', provider: 'SchulLoop', location: 'Online', mode: 'online', deadline: '2026-03-10', description: 'Sample listing: how to write a winning application.', eligibility: 'Open to all.', applyUrl: '', source: 'Sample', verified: false },
  { _id: 'sample-i1', sample: true, type: 'immigration', level: 'Other', title: 'US Diversity Visa Program (Green Card lottery)', provider: 'U.S. Department of State', location: 'United States', mode: 'online', deadline: null, description: 'Sample listing: an official US government program. Entry is free and only through the official website. Check the site for the current registration period.', eligibility: 'Eligibility depends on your country of birth and education or work experience. Check the official instructions.', applyUrl: 'https://dvprogram.state.gov', source: 'dvprogram.state.gov', verified: false },
  { _id: 'sample-i2', sample: true, type: 'immigration', level: 'Other', title: 'Study in Canada: study permits and immigration programs', provider: 'Immigration, Refugees and Citizenship Canada', location: 'Canada', mode: 'online', deadline: null, description: 'Sample listing: official information on study permits and immigration programs. Canada has no lottery; each program has its own rules and fees set by the government.', eligibility: 'Depends on the program. Check the official site.', applyUrl: 'https://www.canada.ca/en/immigration-refugees-citizenship.html', source: 'canada.ca', verified: false },
];

export const formatDate = d => {
  if (!d) return 'Not specified';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return String(d);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Days from today to the deadline; negative when closed. null when no valid deadline.
export const daysLeft = d => {
  if (!d) return null;
  const end = new Date(d);
  if (Number.isNaN(end.getTime())) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.round((end - today) / 86400000);
};

export const deadlineNote = d => {
  const n = daysLeft(d);
  if (n === null) return '';
  if (n < 0) return 'Closed';
  if (n === 0) return 'Closes today';
  return `Closes in ${n} day${n === 1 ? '' : 's'}`;
};
