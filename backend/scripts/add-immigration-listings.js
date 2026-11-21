// Adds two official Immigration listings (US Diversity Visa information and Study in Canada) to the
// Scholarships & Opportunities section. Safe to run more than once: existing listings are left alone.
// Usage (in the backend folder):  node scripts/add-immigration-listings.js
// Deadlines are left empty on purpose: dates change every year, so an admin should set them from the
// official website before marking a listing verified.
const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/schulloop';
const schema = new mongoose.Schema({}, { strict: false, timestamps: true });
const Scholarship = mongoose.models.Scholarship || mongoose.model('Scholarship', schema);

const WARNING = 'Entering is free. Use only the official government website. Never pay anyone to enter, to improve your chances, or to "win".';
const LISTINGS = [
  {
    title: 'US Diversity Visa Program (Green Card lottery)', provider: 'U.S. Department of State', type: 'immigration', level: 'Other',
    location: 'United States', mode: 'online', deadline: null,
    description: `An official US government program. ${WARNING} Check the official site for the current registration period.`,
    eligibility: 'Depends on your country of birth and your education or work experience. Read the official instructions.',
    applyUrl: 'https://dvprogram.state.gov', source: 'dvprogram.state.gov', verified: false,
  },
  {
    title: 'Study in Canada: study permits and immigration programs', provider: 'Immigration, Refugees and Citizenship Canada', type: 'immigration', level: 'Other',
    location: 'Canada', mode: 'online', deadline: null,
    description: 'Official information on study permits and immigration programs. Canada has no lottery: each program has its own rules and government fees. Never pay anyone who promises a guaranteed result.',
    eligibility: 'Depends on the program. Read the official instructions.',
    applyUrl: 'https://www.canada.ca/en/immigration-refugees-citizenship.html', source: 'canada.ca', verified: false,
  },
];

(async () => {
  await mongoose.connect(MONGO_URI);
  for (const item of LISTINGS) {
    const exists = await Scholarship.findOne({ title: item.title });
    if (exists) { console.log('Already there:', item.title); continue; }
    await Scholarship.create(item);
    console.log('Added:', item.title);
  }
  await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
