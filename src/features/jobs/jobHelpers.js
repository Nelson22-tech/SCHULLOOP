// Shared helpers + small components for the Job Portal screens.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { C, Btn, Card } from '../../shared/ui/kit';
import apiService from '../../shared/services/apiService';

export const SAVED_KEY = 'schulloop_saved_jobs';

// Discovery-only fallback so the screens still look like the preview board when the API has no jobs.
export const SAMPLE_JOBS = [
  { _id: 'sample-1', title: 'Software Engineer', company: 'Google', location: 'Remote', jobType: 'Full-time', salary: '$120,000 - $160,000 / year', description: 'We are looking for a skilled Software Engineer to join our team and help build the next generation of products. You will design, develop, and maintain scalable applications.', skills: ["Bachelor's degree in Computer Science or related field", '2+ years of experience in software development', 'Proficiency in JavaScript, React, or similar technologies'], sample: true },
  { _id: 'sample-2', title: 'Frontend Developer', company: 'Amazon', location: 'Remote', jobType: 'Full-time', salary: '$90,000 - $130,000 / year', description: 'Build fast, accessible user interfaces for millions of customers.', skills: ['React', 'TypeScript', 'CSS'], sample: true },
  { _id: 'sample-3', title: 'Data Analyst', company: 'Microsoft', location: 'New York, USA', jobType: 'Full-time', salary: '$70,000 - $100,000 / year', description: 'Turn data into insight for product and business teams.', skills: ['SQL', 'Excel', 'Power BI'], sample: true },
  { _id: 'sample-4', title: 'UX/UI Designer', company: 'Apple', location: 'San Francisco, USA', jobType: 'Full-time', salary: '$90,000 - $120,000 / year', description: 'Design beautiful, intuitive experiences.', skills: ['Figma', 'Prototyping', 'User research'], sample: true },
];

export const JOB_TYPES = ['Full-time', 'Part-time', 'Internship', 'Contract'];
export const EXPERIENCE_LEVELS = ['Entry Level', 'Mid Level', 'Senior Level'];
export const SALARY_RANGES = ['Under $50k', '$50k - $100k', '$100k+'];

export const getJobId = job => String(job?._id || job?.id || '');
export const jobTypeLabel = job => job?.jobType || 'Full-time';
export const jobLocation = job => job?.location || 'Remote';
const norm = v => String(v || '').toLowerCase().replace(/[-_\s]/g, '');

export const fetchJobs = async () => {
  const res = await apiService.getJobs();
  const list = res?.jobs || [];
  return list.length ? list : SAMPLE_JOBS;
};

export const getSavedIds = async () => {
  try {
    const raw = await AsyncStorage.getItem(SAVED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
};

// Returns the new list of saved ids after toggling `id`.
export const toggleSavedId = async (id, current) => {
  const sid = String(id);
  const next = current.includes(sid) ? current.filter(x => x !== sid) : [...current, sid];
  try { await AsyncStorage.setItem(SAVED_KEY, JSON.stringify(next)); } catch (e) { /* ignore */ }
  return next;
};

// First number found in a salary string, in thousands-agnostic dollars (e.g. "$120,000 - ..." -> 120000).
const salaryNumbers = salary => (String(salary || '').match(/\d[\d,]*/g) || []).map(n => Number(n.replace(/,/g, '')));

export const applyJobFilters = (jobs, f = {}) => {
  const q = String(f.query || '').toLowerCase().trim();
  return jobs.filter(j => {
    if (q && !`${j.title} ${j.company} ${j.location} ${(j.skills || []).join(' ')}`.toLowerCase().includes(q)) return false;
    const type = f.type && f.type !== 'All' ? f.type : f.jobType;
    if (type && norm(jobTypeLabel(j)) !== norm(type)) return false;
    if (f.location && !String(j.location || '').toLowerCase().includes(String(f.location).toLowerCase())) return false;
    if (f.company && String(j.company || '').toLowerCase() !== String(f.company).toLowerCase()) return false;
    if (f.experience) {
      const text = `${j.title} ${j.description}`.toLowerCase();
      const senior = /senior|lead|principal|\bsr\b/.test(text);
      const entry = /junior|entry|graduate|intern|trainee|\bjr\b/.test(text);
      if (f.experience === 'Senior Level' && !senior) return false;
      if (f.experience === 'Entry Level' && !entry) return false;
      if (f.experience === 'Mid Level' && (senior || entry)) return false;
    }
    if (f.salary) {
      const nums = salaryNumbers(j.salary);
      if (!nums.length) return false;
      const top = Math.max(...nums);
      if (f.salary === 'Under $50k' && top >= 50000) return false;
      if (f.salary === '$50k - $100k' && (top < 50000 || top > 100000)) return false;
      if (f.salary === '$100k+' && top <= 100000) return false;
    }
    return true;
  });
};

export const formatDate = value => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};
export const formatDateTime = value => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : `${formatDate(d)} - ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
};

// Application status -> board label / filter bucket.
export const appStatusLabel = status => ({ pending: 'Applied', reviewing: 'Applied', interview: 'Interview', accepted: 'Hired', rejected: 'Rejected', withdrawn: 'Withdrawn' }[status] || status || 'Applied');
export const appStatusTone = status => ({ pending: 'amber', reviewing: 'amber', interview: 'purple', accepted: 'green', rejected: 'red', withdrawn: 'gray' }[status] || 'blue');
export const appBucket = status => (['pending', 'reviewing'].includes(status) ? 'Applied' : status === 'interview' ? 'Interview' : status === 'accepted' ? 'Hired' : 'Other');

export const applicationJob = (app, jobs = []) => jobs.find(j => getJobId(j) === String(app?.jobId?._id || app?.jobId)) || null;

// Company logo tile: image if the API gives one, otherwise the company initial on a soft blue tile.
export const CompanyLogo = ({ job, size = 46 }) => (
  job?.companyLogo
    ? <Image source={{ uri: job.companyLogo }} style={{ width: size, height: size, borderRadius: 10, backgroundColor: C.blueSoft }} />
    : <View style={{ width: size, height: size, borderRadius: 10, backgroundColor: C.blueSoft, borderWidth: 1, borderColor: C.blueLine, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: C.blue, fontWeight: '900', fontSize: size * 0.4 }}>{String(job?.company || job?.title || 'C')[0].toUpperCase()}</Text>
      </View>
);

// Compact job card used on Home / Listings / Saved.
export const JobCard = ({ job, onPress, onApply, saved, onToggleSave, showSave = true, showApply = true }) => (
  <Card onPress={onPress} style={s.card}>
    <View style={s.top}>
      <CompanyLogo job={job} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={s.title} numberOfLines={2}>{job.title}</Text>
        <Text style={s.company}>{job.company}</Text>
        <View style={s.metaRow}>
          <Ionicons name="location-outline" size={12} color={C.muted} />
          <Text style={s.meta}> {jobLocation(job)}</Text>
          <Text style={s.meta}>  •  {jobTypeLabel(job)}</Text>
        </View>
      </View>
      {showSave ? (
        <TouchableOpacity onPress={onToggleSave} hitSlop={10}>
          <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={20} color={saved ? C.blue : C.muted} />
        </TouchableOpacity>
      ) : null}
    </View>
    <View style={s.bottom}>
      <Text style={s.salary}>{job.salary || 'Salary not specified'}</Text>
      {showApply ? <Btn title="Apply Now" onPress={onApply} style={s.applyBtn} /> : null}
    </View>
  </Card>
);

const s = StyleSheet.create({
  card: { marginBottom: 12 },
  top: { flexDirection: 'row', alignItems: 'flex-start' },
  title: { fontSize: 15, fontWeight: '800', color: C.text },
  company: { fontSize: 13, color: C.muted, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  meta: { fontSize: 11.5, color: C.muted },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  salary: { fontSize: 12, color: C.text, flex: 1, marginRight: 8 },
  applyBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
});
