import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import apiService from '../../shared/services/apiService';
import { Btn, Card, Field, FormGrid, H3, Hint, ListItem, Muted, Notice, PageHead, Pill, Select, Stat, StatGrid, P } from './portalKit';
import { statusPill } from './sectionsA';

const run = async (ctx, fn, okMessage) => {
  try { const r = await fn(); if (okMessage) ctx.toast(okMessage); return r; }
  catch (e) { ctx.toast(e.message || 'Something went wrong'); return null; }
};
const fmt = (d) => {
  if (!d) return '';
  const dt = new Date(d); const now = new Date();
  const days = Math.floor((now - dt) / 86400000);
  if (days <= 0 && dt.getDate() === now.getDate()) return 'Today';
  if (days <= 1) return 'Yesterday';
  return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

// ---------------------------------------------------------------- Enquiries
export const EnquiriesSection = ({ ctx }) => {
  const [list, setList] = useState(null);
  const [open, setOpen] = useState(null);
  const [reply, setReply] = useState('');
  const load = () => apiService.getSchoolEnquiries().then((r) => setList(r.enquiries || [])).catch((e) => { setList([]); ctx.toast(e.message); });
  useEffect(() => { load(); }, []);
  const unread = (list || []).filter((e) => e.status === 'unread').length;
  const openRow = async (e) => {
    setReply(''); setOpen(open === e._id ? null : e._id);
    if (e.status === 'unread') { await run(ctx, () => apiService.updateSchoolEnquiry(e._id, { status: 'read' })); load(); }
  };
  const send = async (e) => {
    if (!reply.trim()) { ctx.toast('Write a reply first'); return; }
    const r = await run(ctx, () => apiService.updateSchoolEnquiry(e._id, { reply: reply.trim() }), 'Reply sent');
    if (r) { setReply(''); setOpen(null); load(); }
  };
  const tone = { unread: 'amber', read: 'gray', replied: 'green' };
  const label = { unread: 'Unread', read: 'Read', replied: 'Replied' };
  return (
    <View>
      <PageHead eyebrow="Communication" title="School enquiries" sub="Questions from parents, guardians and prospective students." />
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <H3 style={{ marginBottom: 0 }}>Inbox</H3><Pill label={`${unread} unread`} />
        </View>
        {(list || []).map((e) => (
          <View key={e._id} style={{ borderBottomWidth: 1, borderBottomColor: P.line }}>
            <TouchableOpacity activeOpacity={0.8} onPress={() => openRow(e)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 13, gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', color: P.ink, fontSize: 13 }}>{e.subject}</Text>
                <Text style={{ color: P.muted, fontSize: 12, marginTop: 2 }}>{(e.userId && e.userId.userType === 'student') ? 'Student account' : 'Parent account'} · {fmt(e.createdAt)}</Text>
              </View>
              <Pill tone={tone[e.status]} label={label[e.status]} />
              <Text style={{ color: P.blue, fontWeight: '700', fontSize: 12 }}>{open === e._id ? 'Close' : 'Open'}</Text>
            </TouchableOpacity>
            {open === e._id ? (
              <View style={{ paddingBottom: 14 }}>
                <View style={{ backgroundColor: '#f6f8fb', borderRadius: 10, padding: 12 }}><Text style={{ color: P.ink, fontSize: 13, lineHeight: 19 }}>{e.message}</Text></View>
                {e.reply ? <View style={{ marginTop: 10, backgroundColor: '#e7f6ed', borderRadius: 10, padding: 12 }}><Text style={{ color: '#167342', fontSize: 12, fontWeight: '700', marginBottom: 3 }}>Your reply</Text><Text style={{ color: P.ink, fontSize: 13 }}>{e.reply}</Text></View> : (
                  <View style={{ marginTop: 10 }}>
                    <Field multiline value={reply} onChangeText={setReply} placeholder="Write your reply..." />
                    <Btn kind="primary" title="Send reply" onPress={() => send(e)} style={{ alignSelf: 'flex-start', marginTop: 10 }} />
                  </View>
                )}
              </View>
            ) : null}
          </View>
        ))}
        {list && !list.length ? <Muted style={{ marginTop: 10, marginBottom: 4 }}>No enquiries yet. Families can contact you from your public school page.</Muted> : null}
      </Card>
    </View>
  );
};

// ---------------------------------------------------------------- Announcements
const CATS = ['Admissions', 'News', 'Event', 'Academic calendar'];
export const AnnouncementsSection = ({ ctx }) => {
  const [list, setList] = useState([]);
  const [title, setTitle] = useState(''); const [body, setBody] = useState(''); const [cat, setCat] = useState('Admissions'); const [date, setDate] = useState('');
  const load = () => apiService.getSchoolAnnouncements().then((r) => setList(r.announcements || [])).catch(() => {});
  useEffect(() => { load(); }, []);
  const publish = async () => {
    if (!title.trim() || !body.trim()) { ctx.toast('Add a title and message first'); return; }
    const r = await run(ctx, () => apiService.createSchoolAnnouncement({ title: title.trim(), body: body.trim(), category: cat, publishDate: date || undefined }), 'Announcement published');
    if (r) { setTitle(''); setBody(''); setDate(''); load(); }
  };
  const remove = async (id) => { await run(ctx, () => apiService.deleteSchoolAnnouncement(id), 'Announcement removed'); load(); };
  return (
    <View>
      <PageHead eyebrow="School communications" title="Announcements & events" sub="Publish news and important updates on your school's public page." />
      <Card>
        <H3>Create announcement</H3>
        <FormGrid>
          <Field full label="Announcement title" value={title} onChangeText={setTitle} placeholder="e.g. 2026/2027 admissions now open" />
          <Select label="Category" value={cat} options={CATS} onChange={setCat} />
          <Field label="Publish date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD (optional)" />
          <Field full multiline label="Message" value={body} onChangeText={setBody} placeholder="Write the announcement for parents and students..." />
        </FormGrid>
        <Btn kind="primary" title="Publish announcement" onPress={publish} style={{ alignSelf: 'flex-start', marginTop: 12 }} />
      </Card>
      <Card>
        <H3>Published posts</H3>
        {list.map((a, i) => (
          <ListItem key={a._id} title={a.title} sub={`${a.category} · Published ${fmt(a.publishDate || a.createdAt)}`} last={i === list.length - 1}
            right={<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Pill tone="green" label="Published" /><TouchableOpacity onPress={() => remove(a._id)} hitSlop={8}><Ionicons name="trash-outline" size={17} color={P.muted} /></TouchableOpacity></View>} />
        ))}
        {!list.length ? <Muted style={{ marginTop: 0, marginBottom: 0 }}>Nothing published yet.</Muted> : null}
      </Card>
    </View>
  );
};

// ---------------------------------------------------------------- Verification
const DOC_KINDS = ['School registration / authorisation document', 'Administrator authorisation letter', 'Official contact confirmation'];
export const VerificationSection = ({ ctx }) => {
  const s = ctx.school;
  const docs = s.verificationDocs || [];
  const [kind, setKind] = useState(DOC_KINDS[0]);
  const has = (i) => docs.some((d) => d.kind === DOC_KINDS[i]);
  const upload = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
    if (r.canceled || !r.assets || !r.assets[0]) return;
    const a = r.assets[0];
    await run(ctx, async () => {
      const u = await apiService.uploadFile(a.uri, a.name || `document-${Date.now()}`, a.mimeType || 'application/pdf', { private: true });
      await apiService.addVerificationDocument({ kind, name: a.name || '', url: u.url });
      await ctx.reload();
    }, 'Document uploaded');
  };
  const submit = () => run(ctx, async () => { await apiService.submitVerification(); await ctx.reload(); }, 'Submitted for review');
  const review = s.verificationStatus === 'verified' ? <Pill tone="green" label="Verified" /> : s.verificationSubmittedAt ? <Pill label="Under review" /> : <Pill tone="gray" label="Awaiting submission" />;
  const item = (i, title, sub, tag) => (
    <ListItem key={title} title={title} sub={sub} last={false} right={has(i) ? <Pill tone="green" label="Uploaded" /> : <Pill tone={tag === 'Required' ? 'amber' : 'gray'} label={tag} />} />
  );
  return (
    <View>
      <PageHead eyebrow="Trust & authenticity" title="School verification" sub="Prove that this is an official school profile and that you are authorised to manage it." actions={statusPill(s)} />
      <Notice>A school profile can be created before verification, but the verified badge should only be granted after SchulLoop's review.</Notice>
      <Card>
        <H3 style={{ marginBottom: 5 }}>Verification checklist</H3>
        {item(0, 'School registration / authorisation document', "Upload a current official document proving the school's identity.", 'Required')}
        {item(1, 'Administrator authorisation letter', 'Letter confirming that you are permitted to manage this school profile.', 'Required')}
        {item(2, 'Official contact confirmation', 'School email or phone number that can be independently checked.', 'Recommended')}
        <View style={{ marginTop: 14 }}>
          <Select label="Document type" value={kind} options={DOC_KINDS} onChange={setKind} />
          <Btn kind="primary" icon="add" title="Upload verification document" onPress={upload} style={{ alignSelf: 'flex-start', marginTop: 12 }} />
        </View>
      </Card>
      <Card>
        <H3>Review status</H3>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={{ fontWeight: '800', color: P.ink }}>Submitted documents</Text>{review}</View>
        {docs.map((d) => (
          <TouchableOpacity key={d._id} onPress={() => apiService.openPrivateFile(d.url).catch((e) => ctx.toast(e.message))} style={{ marginTop: 6 }}>
            <Hint>• {d.name || d.kind} ({d.kind}) — tap to view</Hint>
          </TouchableOpacity>
        ))}
        <Hint style={{ marginVertical: 10 }}>Once submitted, SchulLoop's platform verification team reviews the documents and may request clarification.</Hint>
        {docs.length && !s.verificationSubmittedAt && s.verificationStatus !== 'verified' ? <Btn kind="soft" title="Submit for review" onPress={submit} style={{ alignSelf: 'flex-start' }} /> : null}
      </Card>
    </View>
  );
};

// ---------------------------------------------------------------- Staff access
const ROLE_LABEL = { school_admin: 'School Administrator', admissions_officer: 'Admissions Officer', communications_officer: 'Communications Officer' };
const ROLE_SCOPE = { school_admin: 'Full school management', admissions_officer: 'Admissions and enquiries', communications_officer: 'Gallery and announcements' };
export const StaffSection = ({ ctx }) => {
  const [data, setData] = useState({ owner: null, staff: [] });
  const [form, setForm] = useState(false); const [email, setEmail] = useState(''); const [role, setRole] = useState(ROLE_LABEL.admissions_officer);
  const load = () => apiService.getSchoolStaff().then(setData).catch((e) => ctx.toast(e.message));
  useEffect(() => { load(); }, []);
  const key = Object.keys(ROLE_LABEL).find((r) => ROLE_LABEL[r] === role);
  const invite = async () => {
    const r = await run(ctx, () => apiService.inviteSchoolStaff({ email: email.trim(), role: key }), 'Access granted');
    if (r) { setEmail(''); setForm(false); load(); }
  };
  const remove = async (id) => { await run(ctx, () => apiService.removeSchoolStaff(id), 'Access removed'); load(); };
  return (
    <View>
      <PageHead eyebrow="Team permissions" title="Staff access" sub="Invite trusted staff and control what each person can manage."
        actions={<Btn kind="primary" icon="add" title="Invite staff" onPress={() => setForm(!form)} />} />
      <Notice>Only the school owner or an authorised school administrator should be able to grant or remove access.</Notice>
      {form ? (
        <Card>
          <H3>Invite staff</H3>
          <FormGrid>
            <Field label="Staff email (they must have a SchulLoop account to sign in)" value={email} onChangeText={setEmail} placeholder="name@school.com" keyboardType="email-address" autoCapitalize="none" />
            <Select label="Role" value={role} options={Object.values(ROLE_LABEL)} onChange={setRole} />
          </FormGrid>
          <Btn kind="primary" title="Grant access" onPress={invite} style={{ alignSelf: 'flex-start', marginTop: 12 }} />
        </Card>
      ) : null}
      <Card>
        <H3>People with access</H3>
        {data.owner ? <ListItem title="School Administrator" sub={`${data.owner.email} · Full school management`} right={<Pill tone="green" label="Owner" />} last={!data.staff.length} /> : null}
        {data.staff.map((m, i) => (
          <ListItem key={m._id} title={ROLE_LABEL[m.role]} sub={`${m.email} · ${ROLE_SCOPE[m.role]}`} last={i === data.staff.length - 1}
            right={<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Pill tone="gray" label="Staff" /><TouchableOpacity onPress={() => remove(m._id)} hitSlop={8}><Ionicons name="close-circle-outline" size={18} color={P.muted} /></TouchableOpacity></View>} />
        ))}
      </Card>
      <Card>
        <H3>Suggested permission roles</H3>
        <ListItem title="Owner / Principal" sub="All school settings, staff permissions and submissions." />
        <ListItem title="Admissions Officer" sub="Admissions information and enquiries only." />
        <ListItem title="Communications Officer" sub="Gallery, school news and announcements." last />
      </Card>
    </View>
  );
};

// ---------------------------------------------------------------- Analytics
export const AnalyticsSection = () => {
  const [a, setA] = useState(null);
  useEffect(() => { apiService.getSchoolAnalytics().then(setA).catch(() => setA({})); }, []);
  const v = (x) => (a && x != null ? String(x) : '-');
  return (
    <View>
      <PageHead eyebrow="School visibility" title="Analytics" sub="Understand how people discover and interact with your school profile." actions={<Pill tone="gray" label="Last 30 days" />} />
      <StatGrid>
        <Stat label="Profile views · 30 days" value={v(a && a.views)} />
        <Stat label="Contact clicks" value={v(a && a.contacts)} />
        <Stat label="Enquiry submissions" value={v(a && a.enquiries)} />
        <Stat label="Saved by students" value={v(a && a.saved)} />
      </StatGrid>
      <Card>
        <H3>What the school should learn</H3>
        <Text style={{ color: P.muted, lineHeight: 20 }}>Which profile pages attract attention, which contact methods are used, and which admission announcements receive engagement. Analytics should show aggregate activity, not expose private student browsing histories.</Text>
      </Card>
    </View>
  );
};

// ---------------------------------------------------------------- Settings
export const SettingsSection = ({ ctx }) => (
  <View>
    <PageHead eyebrow="Account management" title="Settings" sub="Manage your school portal account and preferences." />
    <Card>
      <H3>Administrator account</H3>
      <FormGrid>
        <Field label="Full name" value={ctx.user.fullName} editable={false} />
        <Field label="Work email" value={ctx.user.email} editable={false} />
        <Field label="Phone" value={ctx.user.phone || ''} editable={false} placeholder="+237" />
        <Field label="Role in this portal" value={({ owner: 'Owner', school_admin: 'School Administrator', admissions_officer: 'Admissions Officer', communications_officer: 'Communications Officer' })[ctx.role] || ctx.role} editable={false} />
      </FormGrid>
      <Hint style={{ marginTop: 10 }}>Edit your personal details from your SchulLoop profile.</Hint>
    </Card>
    <Card>
      <H3>Security</H3>
      <ListItem title="Password" sub="Change your password regularly and never share it." right={<Btn title="Change" onPress={() => ctx.navigation.navigate('AccountSecurity')} />} />
      <ListItem title="Sign-in protection" sub="Additional verification for sensitive actions." right={<Pill tone="gray" label="Recommended" />} last />
    </Card>
  </View>
);
