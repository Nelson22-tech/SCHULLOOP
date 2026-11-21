import apiService from '../../shared/services/apiService';

export const EMPTY_JOURNEY = { stage: 'student', education: [], qualifications: [], skills: [], experience: [], careerGoals: '', visibility: { education: 'public', experience: 'public', skills: 'public', contact: 'connections' } };
export const fetchJourney = async () => {
  const r = await apiService.request('/me/journey');
  return { ...EMPTY_JOURNEY, ...(r.journey || {}), visibility: { ...EMPTY_JOURNEY.visibility, ...((r.journey || {}).visibility || {}) } };
};
export const saveJourney = async (patch) => (await apiService.request('/me/journey', 'PUT', patch)).journey;
export const fetchCapabilities = async () => (await apiService.request('/me/capabilities')).capabilities || [];

export const STAGES = [
  { key: 'student', label: 'Student', icon: 'school' },
  { key: 'graduate', label: 'Graduate', icon: 'ribbon' },
  { key: 'job_seeker', label: 'Job Seeker', icon: 'search' },
  { key: 'freelancer', label: 'Freelancer', icon: 'laptop' },
  { key: 'employer', label: 'Employer', icon: 'business' },
];
export const CAPABILITY_LABELS = { student: 'Student', graduate: 'Graduate', job_seeker: 'Job Seeker', freelancer: 'Freelancer', service_provider: 'Service Provider', employer: 'Employer', school_representative: 'School Representative' };
