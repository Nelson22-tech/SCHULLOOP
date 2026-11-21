import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import apiService from '../../shared/services/apiService';
import { Btn, Card, Check, Field, FormGrid, H3, Hint, ListItem, Muted, Notice, PageHead, Pill, Progress, Select, Stat, StatGrid, Thumb, UploadBox, P, k } from './portalKit';

const run = async (ctx, fn, okMessage) => {
  try { const r = await fn(); if (okMessage) ctx.toast(okMessage); await ctx.reload(); return r; }
  catch (e) { ctx.toast(e.message || 'Something went wrong'); return null; }
};
const shortDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '');
export const statusPill = (s) => (s.verificationStatus === 'verified' ? <Pill tone="green" label="Verified" /> : s.verificationStatus === 'claimed' ? <Pill label="Pending verification" /> : <Pill tone="gray" label="Unverified" />);

// ---------------------------------------------------------------- Dashboard
export const DashboardSection = ({ ctx }) => {
  const { school } = ctx;
  const { width } = useWindowDimensions();
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  useEffect(() => {
    let on = true;
    (async () => {
      if (ctx.can('analytics')) { try { const a = await apiService.getSchoolAnalytics(); if (on) setStats(a); } catch (e) { /* stat cards fall back to dashes */ } }
      if (ctx.can('enquiries')) { try { const e = await apiService.getSchoolEnquiries(); if (on) setRecent((e.enquiries || []).slice(0, 3)); } catch (e) { /* ignore */ } }
    })();
    return () => { on = false; };
  }, []);
  const change = stats && stats.viewsChange;
  const completion = school.completion || 0;
  const wide = width >= 900;
  const quick = [
    ['images-outline', 'Upload pictures', 'Campus, classrooms and facilities', 'gallery'],
    ['library-outline', 'Add programmes', 'Levels and subjects offered', 'academics'],
    ['clipboard-outline', 'Admission details', 'Requirements and dates', 'admissions'],
    ['megaphone-outline', 'Post announcement', 'News, events and updates', 'announcements'],
  ].filter((q) => ctx.can(q[3]));
  return (
    <View>
      <PageHead eyebrow="School workspace" title={`Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, ${ctx.firstName}`}
        sub="Manage your school's presence and keep information up to date."
        actions={<>{ctx.can('profile') ? <Btn title="Edit profile" onPress={() => ctx.go('profile')} /> : null}{ctx.can('gallery') ? <Btn kind="primary" icon="add" title="Upload pictures" onPress={() => ctx.go('gallery')} /> : null}</>} />
      <StatGrid>
        <Stat label="Profile views" value={stats ? String(stats.views) : '-'} foot={change == null ? 'Last 30 days' : `${change >= 0 ? '↑' : '↓'} ${Math.abs(change)}% this month`} />
        <Stat label="New enquiries" value={stats ? String(stats.unread) : '-'} foot={stats ? `${stats.unread} need a response` : ' '} />
        <Stat label="Gallery photos" value={String((school.gallery || []).length)} foot="Add more campus photos" />
        <Stat label="Profile completion" value={`${completion}%`} foot="Keep improving your profile" />
      </StatGrid>
      <View style={{ flexDirection: wide ? 'row' : 'column', gap: 16 }}>
        <Card style={{ flex: wide ? 1.3 : undefined }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <H3 style={{ marginBottom: 0 }}>Your school profile</H3>{statusPill(school)}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
            <View style={{ width: 64, height: 64, borderRadius: 13, backgroundColor: '#edf3fa', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {school.logoUrl ? <Thumb uri={school.logoUrl} style={{ width: 64, height: 64 }} /> : <Ionicons name="business" size={27} color={P.blue} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '800', color: P.ink, fontSize: 15 }}>{school.name}</Text>
              <Text style={{ color: P.muted, fontSize: 13 }}>{[school.city, school.region].filter(Boolean).join(', ') || 'Add your location'}</Text>
              <Hint>{[school.type, school.ownership].filter(Boolean).join(' · ')}</Hint>
            </View>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, marginBottom: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: P.ink }}>Profile completion</Text>
            <Text style={{ fontSize: 12, fontWeight: '800', color: P.green }}>{completion}%</Text>
          </View>
          <Progress pct={completion} />
          <Text style={{ color: P.muted, fontSize: 11, marginVertical: 10 }}>Add your facilities, programmes and admission details so families can make informed decisions.</Text>
          {ctx.can('profile') ? <Btn kind="soft" title="Continue profile setup →" onPress={() => ctx.go('profile')} /> : null}
        </Card>
        <Card style={{ flex: wide ? 0.9 : undefined }}>
          <H3>Quick actions</H3>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {quick.map((q) => (
              <TouchableOpacity key={q[3]} activeOpacity={0.85} onPress={() => ctx.go(q[3])} style={{ width: '48%', borderWidth: 1, borderColor: P.line, borderRadius: 12, padding: 14, backgroundColor: '#fff' }}>
                <Ionicons name={q[0]} size={20} color={P.blue} />
                <Text style={{ fontWeight: '800', color: P.ink, marginTop: 6, marginBottom: 3, fontSize: 13 }}>{q[1]}</Text>
                <Text style={{ color: P.muted, fontSize: 11 }}>{q[2]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>
      </View>
      <Card>
        <H3>Recent activity</H3>
        {recent.map((e, i) => (
          <View key={e._id} style={{ flexDirection: 'row', gap: 12, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: P.line }}>
            <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: '#edf4fc', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="mail-outline" size={16} color={P.blue} /></View>
            <View style={{ flex: 1 }}><Text style={{ fontWeight: '800', color: P.ink }}>New school enquiry received</Text><Hint>{e.subject} · {shortDate(e.createdAt)}</Hint></View>
          </View>
        ))}
        {school.verificationStatus !== 'verified' && !(school.verificationDocs || []).length ? (
          <View style={{ flexDirection: 'row', gap: 12, paddingVertical: 12, borderTopWidth: recent.length ? 1 : 0, borderTopColor: P.line }}>
            <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: '#edf4fc', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="checkmark" size={16} color={P.blue} /></View>
            <View style={{ flex: 1 }}><Text style={{ fontWeight: '800', color: P.ink }}>Verification documents requested</Text><Hint>Upload an authorisation letter to continue</Hint></View>
          </View>
        ) : null}
        {!recent.length && (school.verificationDocs || []).length ? <Muted>No recent activity yet.</Muted> : null}
      </Card>
    </View>
  );
};

// ---------------------------------------------------------------- School profile
const TYPES = ['Secondary School', 'Nursery / Kindergarten', 'Primary School', 'University', 'Technical / Vocational'];
const OWNERSHIP = ['Private', 'Public / Government', 'Faith-based', 'Community'];
export const ProfileSection = ({ ctx }) => {
  const s = ctx.school;
  const [f, setF] = useState({
    name: s.name || '', type: s.type && s.type !== 'Other' ? s.type : '', ownership: s.ownership || '', founded: s.founded ? String(s.founded) : '', motto: s.motto || '', description: s.description || '',
    country: s.country || '', region: s.region || '', city: s.city || '', neighbourhood: s.neighbourhood || '', address: s.address || '',
    phone: s.phone || '', email: s.email || '', website: s.website || '', whatsapp: s.whatsapp || '', admissionsContactName: s.admissionsContactName || '', admissionsContactRole: s.admissionsContactRole || '',
    latitude: s.latitude, longitude: s.longitude,
  });
  const set = (key) => (v) => setF((p) => ({ ...p, [key]: v }));
  const pin = async () => {
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') { ctx.toast('Allow location access to set the campus pin'); return; }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setF((p) => ({ ...p, latitude: pos.coords.latitude, longitude: pos.coords.longitude }));
      ctx.toast('Campus pin set. Save to keep it.');
    } catch (e) { ctx.toast('Could not read your location'); }
  };
  const save = (submit) => run(ctx, () => apiService.saveSchoolProfile({ ...f, submit }), submit ? 'Profile submitted for review' : 'Draft saved');
  return (
    <View>
      <PageHead eyebrow="School information" title="School profile" sub="This information appears on your public SchulLoop school page."
        actions={<><Btn title="Save draft" onPress={() => save(false)} /><Btn kind="primary" title="Submit for review" onPress={() => save(true)} /></>} />
      <Notice>Keep your details accurate. Changes to official identity information may require SchulLoop review before publication.</Notice>
      <Card>
        <H3 style={{ marginBottom: 5 }}>Basic information</H3><Muted>Tell families who you are and what type of school you operate.</Muted>
        <FormGrid>
          <Field full label="Official school name *" value={f.name} onChangeText={set('name')} />
          <Select label="School type *" value={f.type} options={TYPES} onChange={set('type')} />
          <Select label="Ownership" value={f.ownership} options={OWNERSHIP} onChange={set('ownership')} />
          <Field label="Year established" value={f.founded} onChangeText={set('founded')} placeholder="e.g. 2008" keyboardType="number-pad" />
          <Field label="School motto" value={f.motto} onChangeText={set('motto')} placeholder="Enter your motto" />
          <Field full multiline label="About the school *" value={f.description} onChangeText={set('description')} placeholder="Describe your school's history, mission, teaching approach and what makes it distinctive." />
        </FormGrid>
      </Card>
      <Card>
        <H3 style={{ marginBottom: 5 }}>Location</H3><Muted>Help students and parents find the correct campus.</Muted>
        <FormGrid>
          <Field label="Country *" value={f.country} onChangeText={set('country')} />
          <Field label="Region *" value={f.region} onChangeText={set('region')} />
          <Field label="City / Town *" value={f.city} onChangeText={set('city')} />
          <Field label="Neighbourhood" value={f.neighbourhood} onChangeText={set('neighbourhood')} placeholder="e.g. Molyko" />
          <Field full label="Street address / directions" value={f.address} onChangeText={set('address')} placeholder="Enter campus address and directions" />
          <View full>
            <Text style={k.label}>Map location</Text>
            <Btn icon="location-outline" title={f.latitude != null && f.longitude != null ? 'Update campus map location' : 'Set campus map location'} onPress={pin} style={{ alignSelf: 'flex-start' }} />
            <Hint>{f.latitude != null && f.longitude != null ? `Pin saved at ${Number(f.latitude).toFixed(4)}, ${Number(f.longitude).toFixed(4)}. Stand on campus when you set it.` : 'Stand on campus and tap the button. Families near you will then find your school first.'}</Hint>
          </View>
        </FormGrid>
      </Card>
      <Card>
        <H3>Contact information</H3>
        <FormGrid>
          <Field label="Official phone number" value={f.phone} onChangeText={set('phone')} placeholder="+237 6XX XXX XXX" keyboardType="phone-pad" />
          <Field label="School email" value={f.email} onChangeText={set('email')} placeholder="info@yourschool.com" keyboardType="email-address" autoCapitalize="none" />
          <Field label="Website" value={f.website} onChangeText={set('website')} placeholder="https://" autoCapitalize="none" />
          <Field label="WhatsApp contact" value={f.whatsapp} onChangeText={set('whatsapp')} placeholder="+237 6XX XXX XXX" keyboardType="phone-pad" />
          <Field label="Admissions contact person" value={f.admissionsContactName} onChangeText={set('admissionsContactName')} placeholder="Full name" />
          <Field label="Admissions contact role" value={f.admissionsContactRole} onChangeText={set('admissionsContactRole')} placeholder="e.g. Admissions Officer" />
        </FormGrid>
      </Card>
    </View>
  );
};

// ---------------------------------------------------------------- Pictures & gallery
export const GallerySection = ({ ctx }) => {
  const { width } = useWindowDimensions();
  const s = ctx.school;
  const [busy, setBusy] = useState(false);
  const pick = async (multiple) => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: multiple, selectionLimit: multiple ? 10 : 1, quality: 0.8 });
    return r.canceled ? [] : (r.assets || []);
  };
  const up = (a) => apiService.uploadFile(a.uri, a.fileName || `school-${Date.now()}.jpg`, a.mimeType || 'image/jpeg');
  const single = async (field) => {
    const a = (await pick(false))[0]; if (!a) return;
    setBusy(true);
    await run(ctx, async () => { const u = await up(a); await apiService.updateSchoolImages({ [field]: u.url }); }, field === 'logoUrl' ? 'Logo updated' : 'Cover photo updated');
    setBusy(false);
  };
  const add = async () => {
    const assets = await pick(true); if (!assets.length) return;
    setBusy(true);
    await run(ctx, async () => { for (const a of assets) { const u = await up(a); await apiService.addSchoolGalleryPhoto(u.url, ''); } }, `${assets.length} photo${assets.length > 1 ? 's' : ''} added`);
    setBusy(false);
  };
  const remove = (id) => run(ctx, () => apiService.deleteSchoolGalleryPhoto(id), 'Photo removed');
  const cols = width >= 700 ? 3 : 2;
  return (
    <View>
      <PageHead eyebrow="Visual identity" title="Pictures & gallery" sub="Show families what your school campus and learning environment look like."
        actions={<Btn kind="primary" icon="add" title="Add pictures" onPress={add} disabled={busy} />} />
      <Notice>Upload only photos your school is authorised to publish. Obtain appropriate permission before uploading identifiable student photographs, especially images of minors.</Notice>
      <Card>
        <H3>School logo and cover photo</H3>
        <FormGrid>
          <View><Text style={k.label}>School logo</Text>
            <UploadBox title="Choose logo" hint="PNG or JPG · square image recommended" onPress={() => single('logoUrl')} icon="business-outline">
              {s.logoUrl ? <Thumb uri={s.logoUrl} style={{ width: 70, height: 70, borderRadius: 10 }} /> : null}
            </UploadBox></View>
          <View><Text style={k.label}>Main cover photo</Text>
            <UploadBox title="Choose cover photo" hint="Wide campus photo recommended" onPress={() => single('coverUrl')} icon="image-outline">
              {s.coverUrl || s.imageUrl ? <Thumb uri={s.coverUrl || s.imageUrl} style={{ width: 140, height: 70, borderRadius: 10 }} /> : null}
            </UploadBox></View>
        </FormGrid>
      </Card>
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <View style={{ flex: 1, paddingRight: 10 }}><H3 style={{ marginBottom: 3 }}>Campus gallery</H3><Muted>Add exterior, classrooms, library, laboratories, sports and events.</Muted></View>
          <Pill tone="green" label={`${(s.gallery || []).length} photos`} />
        </View>
        <UploadBox icon="add" title="Tap to choose photos" hint="You can select multiple image files from your device" onPress={add} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 15 }}>
          {(s.gallery || []).map((g) => (
            <View key={g._id} style={{ width: cols === 3 ? '31.5%' : '47.5%', borderWidth: 1, borderColor: P.line, borderRadius: 11, overflow: 'hidden', backgroundColor: '#fff' }}>
              <Thumb uri={g.url} style={{ width: '100%', height: 125 }} />
              <View style={{ padding: 9 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: P.ink }} numberOfLines={1}>{g.caption || 'Campus photo'}</Text>
                <TouchableOpacity onPress={() => remove(g._id)}><Text style={{ color: P.red, fontSize: 11, marginTop: 4 }}>Remove</Text></TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </Card>
    </View>
  );
};

// ---------------------------------------------------------------- Academics & facilities
const LEVELS = ['Nursery / Kindergarten', 'Primary', 'Secondary', 'Higher education', 'Technical / Vocational'];
const LANGS = ['English', 'French', 'English and French', 'Other'];
const MODES = ['Day school', 'Boarding', 'Day and boarding'];
const FACILITIES = ['Library', 'Science laboratory', 'Computer laboratory', 'Sports ground', 'Cafeteria', 'Boarding facilities', 'School transport', 'Internet access'];
const toggle = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
export const AcademicsSection = ({ ctx }) => {
  const s = ctx.school;
  const [levels, setLevels] = useState(s.levels || []);
  const [language, setLanguage] = useState(s.language || '');
  const [mode, setMode] = useState(s.schoolMode || '');
  const [programs, setPrograms] = useState(s.programList || []);
  const [facilities, setFacilities] = useState(s.facilities || []);
  const [pName, setPName] = useState('');
  const [pLevel, setPLevel] = useState('');
  const addProgram = () => {
    if (!pName.trim()) { ctx.toast('Enter a programme name first'); return; }
    setPrograms((p) => [...p, { name: pName.trim(), level: pLevel, status: 'draft' }]); setPName('');
  };
  const save = () => run(ctx, () => apiService.saveSchoolAcademics({ levels, language, schoolMode: mode, programList: programs, facilities }), 'Academic information saved');
  return (
    <View>
      <PageHead eyebrow="What your school offers" title="Academics & facilities" sub="List your educational levels, programmes and campus facilities."
        actions={<Btn kind="primary" title="Save changes" onPress={save} />} />
      <Card>
        <H3 style={{ marginBottom: 5 }}>Education levels</H3><Muted>Select every level currently offered by your school.</Muted>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 18, marginBottom: 14 }}>
          {LEVELS.map((l) => <Check key={l} label={l} checked={levels.includes(l)} onToggle={() => setLevels(toggle(levels, l))} />)}
        </View>
        <FormGrid>
          <Select label="Language of instruction" value={language} options={LANGS} onChange={setLanguage} />
          <Select label="School mode" value={mode} options={MODES} onChange={setMode} />
        </FormGrid>
      </Card>
      <Card>
        <H3 style={{ marginBottom: 5 }}>Programmes / departments</H3><Muted>Add the programmes students can study.</Muted>
        <FormGrid>
          <Field label="Programme name" value={pName} onChangeText={setPName} placeholder="e.g. Science" />
          <Select label="Level" value={pLevel} options={levels.length ? levels : LEVELS} onChange={setPLevel} />
        </FormGrid>
        <Btn icon="add" title="Add programme" onPress={addProgram} style={{ alignSelf: 'flex-start', marginTop: 12 }} />
        <View style={{ marginTop: 10 }}>
          {programs.map((p, i) => (
            <ListItem key={`${p.name}${i}`} title={p.name} sub={p.level} last={i === programs.length - 1}
              right={<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Pill tone={p.status === 'draft' ? 'gray' : 'green'} label={p.status === 'draft' ? 'Draft' : 'Published'} />
                <TouchableOpacity onPress={() => setPrograms(programs.filter((_, j) => j !== i))} hitSlop={8}><Ionicons name="close-circle-outline" size={18} color={P.muted} /></TouchableOpacity>
              </View>} />
          ))}
        </View>
      </Card>
      <Card>
        <H3 style={{ marginBottom: 5 }}>Facilities</H3><Muted>Only select facilities that are currently available.</Muted>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 18 }}>
          {FACILITIES.map((f) => <Check key={f} label={f} checked={facilities.includes(f)} onToggle={() => setFacilities(toggle(facilities, f))} />)}
        </View>
      </Card>
    </View>
  );
};

// ---------------------------------------------------------------- Admissions
const ADM_STATUS = ['Applications open', 'Coming soon', 'Applications closed'];
const METHODS = ['Contact school', 'Apply online', 'Visit campus', 'Multiple methods'];
export const AdmissionsSection = ({ ctx }) => {
  const s = ctx.school;
  const [f, setF] = useState({ admissionStatus: s.admissionStatus || '', academicYear: s.academicYear || '', admissionOpens: s.admissionOpens || '', admissionCloses: s.admissionCloses || '', requirementsText: s.requirementsText || '', requiredDocuments: s.requiredDocuments || '', applicationMethod: s.applicationMethod || '', applicationFee: s.applicationFee || '' });
  const [enq, setEnq] = useState([]);
  useEffect(() => { if (ctx.can('enquiries')) apiService.getSchoolEnquiries().then((r) => setEnq((r.enquiries || []).slice(0, 2))).catch(() => {}); }, []);
  const set = (key) => (v) => setF((p) => ({ ...p, [key]: v }));
  const save = () => run(ctx, () => apiService.saveSchoolAdmissions(f), 'Admission settings saved');
  return (
    <View>
      <PageHead eyebrow="Student intake" title="Admissions management" sub="Keep admission information current so families know how to apply."
        actions={<Btn kind="primary" title="Save admission settings" onPress={save} />} />
      <Card>
        <H3>Admission status</H3>
        <FormGrid>
          <Select label="Current status" value={f.admissionStatus} options={ADM_STATUS} onChange={set('admissionStatus')} />
          <Field label="Academic year" value={f.academicYear} onChangeText={set('academicYear')} placeholder="e.g. 2026/2027" />
          <Field label="Opening date" value={f.admissionOpens} onChangeText={set('admissionOpens')} placeholder="YYYY-MM-DD" />
          <Field label="Closing date" value={f.admissionCloses} onChangeText={set('admissionCloses')} placeholder="YYYY-MM-DD" />
        </FormGrid>
      </Card>
      <Card>
        <H3>Entry requirements</H3>
        <FormGrid>
          <Field full multiline label="General admission requirements" value={f.requirementsText} onChangeText={set('requirementsText')} placeholder="Explain entrance examinations, age requirements, previous school records, etc." />
          <Field full multiline label="Required documents" value={f.requiredDocuments} onChangeText={set('requiredDocuments')} placeholder="Birth certificate, previous report cards, passport photographs..." />
          <Select label="Application method" value={f.applicationMethod} options={METHODS} onChange={set('applicationMethod')} />
          <Field label="Application fee (optional)" value={f.applicationFee} onChangeText={set('applicationFee')} placeholder="e.g. 5,000 XAF" />
        </FormGrid>
      </Card>
      {ctx.can('enquiries') ? (
        <Card>
          <H3>Admission enquiries</H3>
          {enq.map((e, i) => (
            <ListItem key={e._id} title={`${e.userId && e.userId.userType === 'student' ? 'Student' : 'Parent'} enquiry`} sub={`${e.subject} · ${shortDate(e.createdAt)}`} last={i === enq.length - 1}
              right={<Btn kind="soft" title="View" onPress={() => ctx.go('enquiries')} />} />
          ))}
          {!enq.length ? <Muted style={{ marginTop: 0, marginBottom: 0 }}>No enquiries yet.</Muted> : null}
        </Card>
      ) : null}
    </View>
  );
};
