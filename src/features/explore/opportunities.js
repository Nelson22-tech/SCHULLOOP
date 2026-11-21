// Shared loader for the Explore and Home screens: latest jobs, projects, services and scholarships,
// normalised into one list of { key, type, badge, tone, icon, title, subtitle, route, params }.
import apiService from '../../shared/services/apiService';
import { SAMPLE_JOBS } from '../jobs/jobHelpers';

// SAMPLE data: only used when the API returns nothing or fails. Sample rows never open a detail screen.
const SAMPLE_PROJECTS = [
  { _id: 'sample-p1', title: 'Logo and brand kit for a campus startup', category: 'Design', budgetMin: 150, budgetMax: 300, budgetType: 'fixed' },
  { _id: 'sample-p2', title: 'Build a simple school portfolio website', category: 'Development', budgetMin: 200, budgetMax: 500, budgetType: 'fixed' },
];
const SAMPLE_SERVICES = [
  { _id: 'sample-s1', title: 'Home cleaning near campus', category: 'Cleaning', city: 'Your city', pricing: 'Quote on request' },
  { _id: 'sample-s2', title: 'Laptop and phone repair', category: 'Handyman', city: 'Your city', pricing: 'Quote on request' },
];
const SAMPLE_SCHOLARSHIPS = [
  { _id: 'sample-c1', title: 'Global Excellence Scholarship', provider: 'Sample provider', type: 'scholarship', level: 'Undergraduate' },
];

const safe = (endpoint) => apiService.request(endpoint).catch(() => null);
const isSample = (id) => String(id).startsWith('sample-');
const money = (p) => (p.budgetMin || p.budgetMax) ? `$${p.budgetMin || 0} - $${p.budgetMax || 0}${p.budgetType === 'hourly' ? ' / hr' : ''}` : 'Budget on request';

export const toJob = (j) => ({
  key: `job-${j._id || j.id}`, type: 'job', badge: 'New', tone: 'green', icon: 'briefcase',
  title: j.title, subtitle: [j.company, j.location].filter(Boolean).join(' · '),
  route: 'JobDetails', params: { job: j }, sample: !!j.sample || isSample(j._id),
});
export const toProject = (p, sample) => ({
  key: `project-${p._id}`, type: 'project', badge: 'Freelance', tone: 'purple', icon: 'laptop',
  title: p.title, subtitle: `${p.category || 'Project'} · ${money(p)}`,
  route: sample ? 'Freelance' : 'ProjectDetail', params: sample ? undefined : { projectId: p._id, project: p }, sample,
});
export const toService = (s, sample) => ({
  key: `service-${s._id}`, type: 'service', badge: 'Local Service', tone: 'amber', icon: 'construct',
  title: s.title, subtitle: [s.category, s.city || s.area].filter(Boolean).join(' · '),
  route: sample ? 'LocalServices' : 'ServiceDetail', params: sample ? undefined : { serviceId: s._id, service: s }, sample,
});
export const toScholarship = (c, sample) => ({
  key: `sch-${c._id}`, type: 'scholarship', badge: c.type === 'training' ? 'Training' : c.type === 'webinar' ? 'Webinar' : c.type === 'immigration' ? 'Immigration' : 'Scholarship', tone: 'blue', icon: 'ribbon',
  title: c.title, subtitle: [c.provider, c.level].filter(Boolean).join(' · '),
  route: sample ? 'Scholarships' : 'ScholarshipDetail', params: sample ? undefined : { itemId: c._id, item: c }, sample,
});

// query: optional free text. Returns grouped lists plus flags telling which groups are sample data.
export const loadOpportunities = async (query = '') => {
  const q = query ? `q=${encodeURIComponent(query)}` : '';
  const qs = (extra = '') => { const parts = [q, extra].filter(Boolean).join('&'); return parts ? `?${parts}` : ''; };
  const [jobsRes, projRes, servRes, schRes] = await Promise.all([
    apiService.getJobs().catch(() => null),
    safe(`/projects${qs('status=open')}`),
    safe(`/services${qs()}`),
    safe(`/scholarships${qs()}`),
  ]);
  let jobs = (jobsRes && jobsRes.jobs) || [];
  if (query) { const t = query.toLowerCase(); jobs = jobs.filter(j => [j.title, j.company, j.location, j.description].join(' ').toLowerCase().includes(t)); }
  const projects = (projRes && projRes.projects) || [];
  const services = (servRes && servRes.services) || [];
  const items = (schRes && schRes.items) || [];
  // Sample fallbacks only for the unfiltered "latest" view, never for a search that found nothing.
  const useSamples = !query;
  return {
    jobs: (jobs.length || !useSamples ? jobs.map(toJob) : SAMPLE_JOBS.slice(0, 2).map(toJob)),
    projects: projects.length || !useSamples ? projects.map(p => toProject(p, false)) : SAMPLE_PROJECTS.map(p => toProject(p, true)),
    services: services.length || !useSamples ? services.map(s => toService(s, false)) : SAMPLE_SERVICES.map(s => toService(s, true)),
    scholarships: items.length || !useSamples ? items.map(c => toScholarship(c, false)) : SAMPLE_SCHOLARSHIPS.map(c => toScholarship(c, true)),
  };
};

// Interleave groups round-robin so the featured list mixes types.
export const mixLatest = (g, limit = 6) => {
  const lists = [g.jobs, g.projects, g.services, g.scholarships];
  const out = [];
  for (let i = 0; out.length < limit && i < 10; i += 1) lists.forEach(l => { if (l[i] && out.length < limit) out.push(l[i]); });
  return out;
};
