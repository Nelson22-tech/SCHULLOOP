// Shared helpers for the Freelance Projects screens.
import apiService from '../../shared/services/apiService';
import { API_BASE_URL } from '../../shared/config/api';
import { C } from '../../shared/ui/kit';

// apiService.request needs a full URL, so prefix relative endpoints such as '/projects'.
export const api = (path, method = 'GET', data = null) =>
  apiService.request(path.startsWith('http') ? path : `${API_BASE_URL}${path}`, method, data);

export const CATEGORIES = ['Design', 'Development', 'Writing', 'Marketing', 'Video', 'Other'];

const CATEGORY_STYLE = {
  Design: { icon: 'color-palette', color: C.purple, bg: C.purpleSoft },
  Development: { icon: 'code-slash', color: C.blue, bg: C.blueSoft },
  Writing: { icon: 'create', color: C.amber, bg: C.amberSoft },
  Marketing: { icon: 'megaphone', color: C.red, bg: C.redSoft },
  Video: { icon: 'videocam', color: C.green, bg: C.greenSoft },
  Other: { icon: 'briefcase', color: C.muted, bg: '#EEF1F6' },
};
export const categoryStyle = (category) => CATEGORY_STYLE[category] || CATEGORY_STYLE.Other;

export const budgetText = (p) => {
  const min = Number(p?.budgetMin) || 0;
  const max = Number(p?.budgetMax) || 0;
  const suffix = p?.budgetType === 'hourly' ? '/hr' : '';
  if (min && max) return `$${min} – $${max}${suffix}`;
  if (max || min) return `$${max || min}${suffix}`;
  return 'Budget not set';
};

export const statusLabel = (s = '') => String(s).replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
export const statusTone = (s = '') => ({
  open: 'blue', in_progress: 'amber', completed: 'green', cancelled: 'red', draft: 'gray',
  submitted: 'amber', selected: 'green', rejected: 'red',
}[s] || 'blue');

// SAMPLE DATA: shown only when the API returns nothing or fails. Never submitted anywhere.
export const SAMPLE_PROJECTS = [
  { _id: 'sample-1', title: 'Build a Modern Website', description: 'Sample listing: a small business needs a responsive five-page website.', category: 'Development', skills: ['HTML', 'CSS', 'JavaScript'], budgetMin: 300, budgetMax: 500, budgetType: 'fixed', duration: '5 days left', status: 'open', ownerName: 'Sample Client', proposalCount: 0 },
  { _id: 'sample-2', title: 'Logo Design for a Brand', description: 'Sample listing: design a clean logo and colour palette for a new brand.', category: 'Design', skills: ['Logo', 'Illustrator'], budgetMin: 50, budgetMax: 150, budgetType: 'fixed', duration: '3 days left', status: 'open', ownerName: 'Sample Client', proposalCount: 0 },
  { _id: 'sample-3', title: 'Mobile App UI Design', description: 'Sample listing: design UI screens for a student mobile app.', category: 'Design', skills: ['Figma', 'UI/UX'], budgetMin: 200, budgetMax: 400, budgetType: 'fixed', duration: '1 week left', status: 'open', ownerName: 'Sample Client', proposalCount: 0 },
  { _id: 'sample-4', title: 'Write Blog Articles (Tech)', description: 'Sample listing: write four technology blog articles of 800 words each.', category: 'Writing', skills: ['Writing', 'SEO'], budgetMin: 80, budgetMax: 160, budgetType: 'fixed', duration: '6 days left', status: 'open', ownerName: 'Sample Client', proposalCount: 0 },
];
export const SAMPLE_FREELANCERS = [
  { _id: 'sample-f1', name: 'Sample Freelancer', title: 'Web Developer', skills: ['React', 'Node.js'], rate: '$20/hr', availability: 'available' },
  { _id: 'sample-f2', name: 'Sample Designer', title: 'Graphic Designer', skills: ['Figma', 'Logo'], rate: '$15/hr', availability: 'busy' },
];
export const isSample = (id) => String(id || '').startsWith('sample-');
