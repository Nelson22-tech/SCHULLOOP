import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const schools = [
  { id: 's1', name: 'Greenfield Primary School', level: 'Primary', city: 'Buea', country: 'Cameroon', verified: true, detail: 'Primary education • Admissions information available' },
  { id: 's2', name: 'Atlantic Secondary Academy', level: 'Secondary', city: 'Douala', country: 'Cameroon', verified: false, detail: 'Secondary education • Listing awaiting verification' },
  { id: 's3', name: 'Northbridge University', level: 'University/College', city: 'London', country: 'United Kingdom', verified: true, detail: 'Higher education • Programmes and campus information' },
  { id: 's4', name: 'Sunrise Nursery Centre', level: 'Nursery', city: 'Accra', country: 'Ghana', verified: false, detail: 'Early childhood education • Sample listing' },
  { id: 's5', name: 'Lakeside International School', level: 'Primary', city: 'Nairobi', country: 'Kenya', verified: true, detail: 'Primary education • International curriculum' },
];
const profiles = [
  { name: 'Amina N.', role: 'Student', location: 'Buea, Cameroon', skills: 'Science, debate, languages' },
  { name: 'David K.', role: 'Graduate', location: 'Accra, Ghana', skills: 'Software development, data analysis' },
  { name: 'Maya R.', role: 'Graduate', location: 'London, United Kingdom', skills: 'Design, research, project management' },
];
const jobs = [
  { title: 'Graduate Software Intern', org: 'BrightPath Technologies', place: 'Remote', kind: 'Internship' },
  { title: 'Community Scholarship', org: 'Global Learning Fund', place: 'Multiple countries', kind: 'Scholarship' },
  { title: 'Junior Data Analyst', org: 'Northstar Careers', place: 'Accra, Ghana', kind: 'Job' },
];
const mentors = [
  { name: 'Nadine F.', headline: 'Maths graduate helping students pass GCE and Probatoire', subjects: 'Mathematics, Exam prep', rate: 8, trial: 4, rating: '4.9', lessons: 86, slots: ['Wed 15:00', 'Wed 15:30', 'Fri 09:00'] },
  { name: 'Emmanuel M.', headline: 'Software engineer: learn to code and prepare for interviews', subjects: 'Computer Science, Career advice', rate: 12, trial: 6, rating: '4.8', lessons: 42, slots: ['Thu 17:00', 'Sat 10:00'] },
  { name: 'Linda T.', headline: 'English and French tutor, university admissions coach', subjects: 'English, Languages', rate: 10, trial: 5, rating: 'New', lessons: 0, slots: ['Mon 08:00', 'Mon 08:30', 'Tue 13:00'] },
];
const events = [
  { id: 'e1', title: 'CV and interview workshop', when: 'Sat 14 Nov, 10:00', where: 'Online', host: 'Emmanuel M.', category: 'Workshop', going: 38, capacity: 60 },
  { id: 'e2', title: 'University open day', when: 'Sat 21 Nov, 09:00', where: 'Buea campus', host: 'Northbridge University', category: 'Admissions', going: 120, capacity: 0 },
  { id: 'e3', title: 'Scholarship hunting webinar', when: 'Wed 25 Nov, 18:00', where: 'Online', host: 'Nadine F.', category: 'Webinar', going: 50, capacity: 50 },
];
const sections = ['Schools', 'Mentors', 'Events', 'Student Connect', 'Jobs & Careers', 'Admin Preview'];
const levels = ['All Levels', 'Nursery', 'Primary', 'Secondary', 'University/College'];

export const DemoScreen = ({ navigation }) => {
  const [section, setSection] = useState('Schools');
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('All Levels');
  const [location, setLocation] = useState('Worldwide');
  const [savedJobs, setSavedJobs] = useState([]);
  const [connections, setConnections] = useState([]);
  const [adminAction, setAdminAction] = useState('');
  const [mentorSlot, setMentorSlot] = useState({});
  const [booked, setBooked] = useState([]);
  const [rsvps, setRsvps] = useState([]);

  const filteredSchools = useMemo(() => schools.filter((school) => {
    const matchesLevel = level === 'All Levels' || school.level === level;
    const haystack = `${school.name} ${school.city} ${school.country} ${school.level}`.toLowerCase();
    const matchesQuery = haystack.includes(query.trim().toLowerCase());
    const matchesLocation = location === 'Worldwide' || `${school.city}, ${school.country}`.toLowerCase().includes(location.toLowerCase());
    return matchesLevel && matchesQuery && matchesLocation;
  }), [level, query, location]);

  const previewNotice = (
    <View style={styles.notice}>
      <Text style={styles.noticeTitle}>👀 DEMO PREVIEW — SAMPLE DATA</Text>
      <Text style={styles.noticeText}>Explore the experience safely. These records are illustrative and are not real school, user, employer, or job records. Changes stay in this demo and are not sent to production.</Text>
    </View>
  );

  const renderSchools = () => (
    <>
      <Text style={styles.sectionTitle}>Find schools around the world</Text>
      <Text style={styles.muted}>Try searching by school, city, country, or education level.</Text>
      <TextInput value={query} onChangeText={setQuery} placeholder="Search schools or locations" placeholderTextColor="#718096" style={styles.search} accessibilityLabel="Search sample schools" />
      <Text style={styles.label}>Education level</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {levels.map((item) => <TouchableOpacity key={item} onPress={() => setLevel(item)} style={[styles.chip, level === item && styles.chipActive]}><Text style={[styles.chipText, level === item && styles.chipTextActive]}>{item}</Text></TouchableOpacity>)}
      </ScrollView>
      <Text style={styles.label}>Search location</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {['Worldwide', 'Buea, Cameroon', 'London, United Kingdom', 'Accra, Ghana', 'Nairobi, Kenya'].map((item) => <TouchableOpacity key={item} onPress={() => setLocation(item)} style={[styles.chip, location === item && styles.chipActive]}><Text style={[styles.chipText, location === item && styles.chipTextActive]}>{item}</Text></TouchableOpacity>)}
      </ScrollView>
      <Text style={styles.resultCount}>{filteredSchools.length} sample {filteredSchools.length === 1 ? 'school' : 'schools'}</Text>
      {filteredSchools.map((school) => <View key={school.id} style={styles.card}>
        <View style={styles.rowBetween}><Text style={styles.cardTitle}>{school.name}</Text><Text style={[styles.badge, school.verified ? styles.verified : styles.unverified]}>{school.verified ? '✓ Sample verified' : 'Unverified sample'}</Text></View>
        <Text style={styles.cardMeta}>📍 {school.city}, {school.country}</Text>
        <Text style={styles.cardMeta}>🎓 {school.level}</Text>
        <Text style={styles.cardBody}>{school.detail}</Text>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => Alert.alert('Demo school', `${school.name}\n\n${school.detail}\n\nThis is sample information for preview only.`)}><Text style={styles.secondaryButtonText}>View sample details</Text></TouchableOpacity>
      </View>)}
      {filteredSchools.length === 0 && <Text style={styles.empty}>No sample schools match. Try another search or choose All Levels.</Text>}
    </>
  );

  const renderMentors = () => <>
    <Text style={styles.sectionTitle}>Learn 1-on-1 from a mentor</Text>
    <Text style={styles.muted}>Pick a time and book a trial lesson. Nothing is charged in this demo.</Text>
    {mentors.map((m) => <View key={m.name} style={styles.card}>
      <View style={styles.rowBetween}><Text style={styles.cardTitle}>{m.name}</Text><Text style={styles.cardTitle}>${m.rate}/hr</Text></View>
      <Text style={styles.cardBody}>{m.headline}</Text>
      <Text style={styles.cardMeta}>★ {m.rating} • {m.lessons} lessons • {m.subjects}</Text>
      <Text style={styles.cardMeta}>Trial lesson (30 min): ${m.trial}</Text>
      <View style={styles.rowButtons}>
        {m.slots.map((slot) => <TouchableOpacity key={slot} style={[styles.secondaryButton, mentorSlot[m.name] === slot && styles.tabActive]} onPress={() => setMentorSlot((old) => ({ ...old, [m.name]: slot }))}><Text style={[styles.secondaryButtonText, mentorSlot[m.name] === slot && styles.tabTextActive]}>{slot}</Text></TouchableOpacity>)}
      </View>
      <TouchableOpacity style={[styles.primaryButton, booked.includes(m.name) && styles.disabledButton]} onPress={() => {
        if (booked.includes(m.name)) { setBooked((old) => old.filter((n) => n !== m.name)); return; }
        if (!mentorSlot[m.name]) { Alert.alert('Choose a time', 'Pick one of the time slots first.'); return; }
        setBooked((old) => [...old, m.name]);
        Alert.alert('Trial lesson booked (demo)', `${m.name} on ${mentorSlot[m.name]}\n\nIn the real app you would pay securely and get a video link. No payment was taken.`);
      }}><Text style={styles.primaryButtonText}>{booked.includes(m.name) ? 'Booked in demo (tap to undo)' : 'Book trial lesson'}</Text></TouchableOpacity>
    </View>)}
  </>;

  const renderEvents = () => <>
    <Text style={styles.sectionTitle}>Workshops, meetups and webinars</Text>
    <Text style={styles.muted}>Tap "I'm going" to try the RSVP. Nobody is notified in this demo.</Text>
    {events.map((e) => {
      const going = rsvps.includes(e.id); const full = e.capacity > 0 && e.going >= e.capacity && !going;
      return <View key={e.id} style={styles.card}>
        <Text style={styles.badge}>{e.category}</Text>
        <Text style={styles.cardTitle}>{e.title}</Text>
        <Text style={styles.cardMeta}>{e.when} • {e.where}</Text>
        <Text style={styles.cardMeta}>Hosted by {e.host} • {e.going + (going ? 1 : 0)}{e.capacity ? `/${e.capacity}` : ''} going</Text>
        <TouchableOpacity disabled={full} style={[styles.primaryButton, (going || full) && styles.disabledButton]} onPress={() => setRsvps((old) => (old.includes(e.id) ? old.filter((x) => x !== e.id) : [...old, e.id]))}><Text style={styles.primaryButtonText}>{full ? 'Event is full' : going ? "You're going (tap to cancel)" : "I'm going"}</Text></TouchableOpacity>
      </View>;
    })}
  </>;

  const renderConnect = () => <>
    <Text style={styles.sectionTitle}>Meet the Student Connect experience</Text>
    <Text style={styles.muted}>Explore sample profiles and try a simulated connection. No invitations are sent.</Text>
    {profiles.map((profile) => <View key={profile.name} style={styles.card}>
      <View style={styles.profileAvatar}><Text style={styles.avatarText}>{profile.name.split(' ').map((v) => v[0]).join('').replace('.', '')}</Text></View>
      <Text style={styles.cardTitle}>{profile.name} <Text style={styles.cardMeta}>• {profile.role}</Text></Text>
      <Text style={styles.cardMeta}>📍 {profile.location}</Text>
      <Text style={styles.cardBody}>Interests and skills: {profile.skills}</Text>
      <TouchableOpacity style={[styles.primaryButton, connections.includes(profile.name) && styles.disabledButton]} onPress={() => setConnections((old) => old.includes(profile.name) ? old.filter((name) => name !== profile.name) : [...old, profile.name])}><Text style={styles.primaryButtonText}>{connections.includes(profile.name) ? '✓ Demo connection added' : 'Try connecting'}</Text></TouchableOpacity>
    </View>)}
  </>;

  const renderJobs = () => <>
    <Text style={styles.sectionTitle}>Explore jobs and opportunities</Text>
    <Text style={styles.muted}>Save a sample opportunity to try the interaction. Applications are disabled in preview mode.</Text>
    {jobs.map((job) => <View key={job.title} style={styles.card}>
      <Text style={styles.badge}>{job.kind}</Text><Text style={styles.cardTitle}>{job.title}</Text><Text style={styles.cardMeta}>{job.org} • {job.place}</Text>
      <View style={styles.rowButtons}><TouchableOpacity style={styles.secondaryButton} onPress={() => setSavedJobs((old) => old.includes(job.title) ? old.filter((title) => title !== job.title) : [...old, job.title])}><Text style={styles.secondaryButtonText}>{savedJobs.includes(job.title) ? '★ Saved in demo' : '☆ Save opportunity'}</Text></TouchableOpacity><TouchableOpacity style={styles.primaryButton} onPress={() => Alert.alert('Preview only', 'To apply for a real opportunity, create an account and use the live Jobs & Careers portal.')}><Text style={styles.primaryButtonText}>Preview apply</Text></TouchableOpacity></View>
    </View>)}
  </>;

  const renderAdmin = () => <>
    <Text style={styles.sectionTitle}>Administrative dashboard preview</Text>
    <Text style={styles.muted}>This is a simulated dashboard. These buttons never approve real schools or change production records.</Text>
    <View style={styles.statsRow}><View style={styles.statCard}><Text style={styles.statNumber}>24</Text><Text style={styles.statLabel}>Sample users</Text></View><View style={styles.statCard}><Text style={styles.statNumber}>8</Text><Text style={styles.statLabel}>Sample schools</Text></View><View style={styles.statCard}><Text style={styles.statNumber}>3</Text><Text style={styles.statLabel}>Pending review</Text></View></View>
    {['Review a sample school', 'Review a sample report', 'View sample audit log'].map((action) => <TouchableOpacity key={action} style={styles.adminAction} onPress={() => { setAdminAction(action); Alert.alert('Simulated admin action', `${action}\n\nPreview only. No real account, listing, report, or audit record was changed.`); }}><Text style={styles.adminActionText}>{action} →</Text></TouchableOpacity>)}
    {adminAction ? <Text style={styles.muted}>Last preview action: {adminAction}</Text> : null}
  </>;

  return <ScrollView style={styles.container} contentContainerStyle={styles.content}>
    <View style={styles.hero}>
      <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>‹ Back to sign in</Text></TouchableOpacity>
      <Text style={styles.brand}>🌍 SchulLoop</Text>
      <Text style={styles.heroTitle}>Discover what’s possible.</Text>
      <Text style={styles.heroSubtitle}>Explore schools, student connections, and career opportunities before creating your account.</Text>
    </View>
    {previewNotice}
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
      {sections.map((item) => <TouchableOpacity key={item} onPress={() => setSection(item)} style={[styles.tab, section === item && styles.tabActive]}><Text style={[styles.tabText, section === item && styles.tabTextActive]}>{item}</Text></TouchableOpacity>)}
    </ScrollView>
    <View style={styles.panel}>
      {section === 'Schools' ? renderSchools() : section === 'Mentors' ? renderMentors() : section === 'Events' ? renderEvents() : section === 'Student Connect' ? renderConnect() : section === 'Jobs & Careers' ? renderJobs() : renderAdmin()}
    </View>
    <View style={styles.cta}><Text style={styles.ctaTitle}>Ready to join the real SchulLoop community?</Text><Text style={styles.muted}>Create an account to use live features and interact with real users.</Text><TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('Signup')}><Text style={styles.primaryButtonText}>Create an account</Text></TouchableOpacity><TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate('Login')}><Text style={styles.linkText}>I already have an account · Sign in</Text></TouchableOpacity></View>
    <Text style={styles.footer}>SchulLoop demo • All displayed people, schools, organizations, and opportunities are fictional sample records.</Text>
  </ScrollView>;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F9FF' }, content: { paddingBottom: 32 },
  hero: { backgroundColor: '#0754D8', paddingHorizontal: 22, paddingTop: 24, paddingBottom: 28 }, back: { color: '#D9EAF4', fontSize: 14, marginBottom: 22 }, brand: { color: '#FFFFFF', fontSize: 17, fontWeight: '700', marginBottom: 14 }, heroTitle: { color: '#FFFFFF', fontSize: 30, fontWeight: '800', lineHeight: 36 }, heroSubtitle: { color: '#E0ECF3', fontSize: 15, lineHeight: 22, marginTop: 10 },
  notice: { backgroundColor: '#FFF3CD', borderColor: '#E8C65A', borderWidth: 1, borderRadius: 12, padding: 14, margin: 16, marginBottom: 10 }, noticeTitle: { color: '#72520B', fontSize: 12, fontWeight: '800', marginBottom: 5 }, noticeText: { color: '#72520B', fontSize: 12, lineHeight: 18 },
  tabs: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 }, tab: { borderRadius: 22, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: '#E2E8ED' }, tabActive: { backgroundColor: '#0754D8' }, tabText: { color: '#294451', fontSize: 12, fontWeight: '700' }, tabTextActive: { color: '#FFFFFF' },
  panel: { paddingHorizontal: 16, paddingTop: 12 }, sectionTitle: { fontSize: 22, lineHeight: 28, color: '#102A56', fontWeight: '800', marginBottom: 7 }, muted: { color: '#65757D', fontSize: 13, lineHeight: 19, marginBottom: 12 }, search: { borderWidth: 1, borderColor: '#CBD5DB', borderRadius: 10, backgroundColor: '#FFFFFF', paddingHorizontal: 13, paddingVertical: 12, color: '#102A56', marginVertical: 10 }, label: { color: '#102A56', fontSize: 13, fontWeight: '700', marginTop: 6 }, chips: { gap: 7, paddingVertical: 9 }, chip: { borderWidth: 1, borderColor: '#C6D2D9', borderRadius: 18, paddingVertical: 8, paddingHorizontal: 11, backgroundColor: '#FFFFFF' }, chipActive: { backgroundColor: '#EAF2FF', borderColor: '#0754D8' }, chipText: { color: '#37515E', fontSize: 12 }, chipTextActive: { color: '#0754D8', fontWeight: '800' }, resultCount: { color: '#5C6C73', fontSize: 12, marginVertical: 8 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 15, marginVertical: 7, borderWidth: 1, borderColor: '#DCE7F5' }, rowBetween: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }, cardTitle: { color: '#102A56', fontSize: 16, fontWeight: '800', flexShrink: 1, marginVertical: 5 }, cardMeta: { color: '#63757D', fontSize: 12, marginTop: 4 }, cardBody: { color: '#435963', fontSize: 13, lineHeight: 19, marginTop: 8, marginBottom: 10 }, badge: { color: '#31566A', backgroundColor: '#EEF5FF', overflow: 'hidden', borderRadius: 6, paddingVertical: 4, paddingHorizontal: 7, fontSize: 10, fontWeight: '800', alignSelf: 'flex-start' }, verified: { color: '#17613B', backgroundColor: '#DDF5E6' }, unverified: { color: '#805400', backgroundColor: '#FFF0C2' }, secondaryButton: { borderColor: '#B8C8D0', borderWidth: 1, borderRadius: 9, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center', marginTop: 4 }, secondaryButtonText: { color: '#0754D8', fontWeight: '700', fontSize: 12 }, primaryButton: { backgroundColor: '#0754D8', borderRadius: 9, paddingVertical: 11, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center', marginTop: 8 }, primaryButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 }, disabledButton: { backgroundColor: '#4C8068' }, rowButtons: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 7 }, empty: { color: '#65757D', textAlign: 'center', padding: 22 }, profileAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EAF2FF', alignItems: 'center', justifyContent: 'center', marginBottom: 5 }, avatarText: { color: '#0754D8', fontWeight: '800' },
  statsRow: { flexDirection: 'row', gap: 8, marginVertical: 10 }, statCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#DCE7F5' }, statNumber: { fontSize: 24, fontWeight: '800', color: '#0754D8' }, statLabel: { fontSize: 10, color: '#63757D', marginTop: 4 }, adminAction: { backgroundColor: '#FFFFFF', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#DCE7F5', marginVertical: 5 }, adminActionText: { color: '#0754D8', fontWeight: '700', fontSize: 13 }, cta: { backgroundColor: '#E5EDF1', margin: 16, marginTop: 22, padding: 18, borderRadius: 14 }, ctaTitle: { color: '#102A56', fontSize: 19, fontWeight: '800', marginBottom: 7 }, linkButton: { padding: 12, alignItems: 'center' }, linkText: { color: '#0754D8', fontSize: 13, fontWeight: '700' }, footer: { color: '#78878D', fontSize: 11, textAlign: 'center', lineHeight: 16, paddingHorizontal: 24, marginBottom: 10 },
});
