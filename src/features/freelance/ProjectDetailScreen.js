import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BlueHeader, Btn, C, Card, Field, IconBtn, IconTile, Initials, SectionTitle, StatusPill } from '../../shared/ui/kit';
import { SAMPLE_PROJECTS, api, budgetText, categoryStyle, isSample, statusLabel, statusTone } from './freelanceApi';

export const ProjectDetailScreen = ({ navigation, route }) => {
  const projectId = route?.params?.projectId;
  const sample = isSample(projectId);
  const [project, setProject] = useState(null);
  const [myProposal, setMyProposal] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState('');
  const [price, setPrice] = useState('');
  const [days, setDays] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      if (sample) {
        // SAMPLE_PROJECTS fallback item: read-only, nothing is sent to the server.
        setProject(SAMPLE_PROJECTS.find(p => p._id === projectId) || null);
      } else {
        const res = await api(`/projects/${projectId}`);
        setProject(res.project);
        setMyProposal(res.myProposal || null);
        setIsOwner(!!res.isOwner);
        if (res.isOwner) {
          try { setProposals((await api(`/projects/${projectId}/proposals`)).proposals || []); } catch (e) { setProposals([]); }
        }
        try { const sv = await api('/saved?itemType=project'); setSaved((sv.items || []).some(i => String(i.itemId) === String(projectId))); } catch (e) { /* saved state is optional */ }
      }
    } catch (e) { setError(e.message || 'Could not load this project.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, [projectId, sample]);

  useEffect(() => { load(); }, [load]);

  const toggleSave = async () => {
    if (sample) return Alert.alert('Sample listing', 'Sample projects cannot be saved.');
    try { const res = await api('/saved/toggle', 'POST', { itemType: 'project', itemId: projectId }); setSaved(!!res.saved); }
    catch (e) { Alert.alert('Could not update saved projects', e.message); }
  };

  const submitProposal = async () => {
    const p = Number(price);
    const d = Number(days);
    if (message.trim().length < 20) return Alert.alert('Message too short', 'Explain why you are a good fit (at least 20 characters).');
    if (!(p > 0)) return Alert.alert('Enter your price', 'Your price must be greater than 0.');
    if (!(d > 0)) return Alert.alert('Enter delivery days', 'Delivery time must be at least 1 day.');
    setBusy(true);
    try {
      const res = await api(`/projects/${projectId}/proposals`, 'POST', { message: message.trim(), price: p, deliveryDays: d });
      setMyProposal(res.proposal);
      setMessage(''); setPrice(''); setDays('');
      Alert.alert('Proposal sent', 'The client has been notified.');
    } catch (e) { Alert.alert('Could not send proposal', e.message); }
    finally { setBusy(false); }
  };

  const selectProposal = (pr) => Alert.alert(
    'Select this freelancer?',
    `${pr.freelancer?.name || 'This freelancer'} will be notified and other proposals will be declined.`,
    [{ text: 'Cancel', style: 'cancel' }, { text: 'Select', onPress: async () => {
      try { await api(`/proposals/${pr._id}/select`, 'PUT'); await load(true); }
      catch (e) { Alert.alert('Could not select', e.message); }
    } }],
  );

  const changeStatus = (status, label) => Alert.alert(
    `${label}?`, status === 'cancelled' ? 'The project will be closed to new proposals.' : 'This marks the work as finished.',
    [{ text: 'Back', style: 'cancel' }, { text: label, style: status === 'cancelled' ? 'destructive' : 'default', onPress: async () => {
      try { const res = await api(`/projects/${projectId}/status`, 'PUT', { status }); setProject(res.project || { ...project, status }); }
      catch (e) { Alert.alert('Could not update', e.message); }
    } }],
  );

  if (loading) return <View style={s.root}><BlueHeader title="Project" onBack={() => navigation.goBack()} /><ActivityIndicator color={C.blue} style={{ marginTop: 40 }} /></View>;
  if (error || !project) return (
    <View style={s.root}><BlueHeader title="Project" onBack={() => navigation.goBack()} />
      <Text style={s.empty}>{error || 'Project not found.'}</Text><Btn title="Try again" onPress={() => load()} style={{ marginHorizontal: 16 }} /></View>
  );

  const st = categoryStyle(project.category);
  const isOpen = project.status === 'open';

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <BlueHeader title="Project Details" onBack={() => navigation.goBack()} right={<IconBtn name={saved ? 'bookmark' : 'bookmark-outline'} onPress={toggleSave} />} />
      <ScrollView keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />} contentContainerStyle={{ paddingTop: 14, paddingBottom: 40 }}>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <IconTile name={st.icon} color={st.color} bg={st.bg} box={52} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.title}>{project.title}</Text>
              <Text style={s.sub}>{project.category}</Text>
            </View>
          </View>
          <View style={s.facts}>
            <View style={s.fact}><Text style={s.factLabel}>Budget</Text><Text style={s.factValue}>{budgetText(project)}</Text></View>
            <View style={s.fact}><Text style={s.factLabel}>Duration</Text><Text style={s.factValue}>{project.duration || 'Flexible'}</Text></View>
            <View style={s.fact}><Text style={s.factLabel}>Status</Text><StatusPill label={statusLabel(project.status)} tone={statusTone(project.status)} /></View>
          </View>
          {(project.skills || []).length ? <View style={s.skillRow}>{project.skills.map(sk => <View key={sk} style={s.skill}><Text style={s.skillText}>{sk}</Text></View>)}</View> : null}
          <Text style={s.h}>Description</Text>
          <Text style={s.body}>{project.description}</Text>
          <Text style={s.sub}>Posted by {project.ownerName || 'Client'}</Text>
        </Card>

        {sample && <Text style={s.note}>Sample listing. Proposals can only be sent on real projects.</Text>}

        {!sample && !isOwner && myProposal && (
          <Card>
            <View style={s.between}><Text style={s.h}>Your proposal</Text><StatusPill label={statusLabel(myProposal.status)} tone={statusTone(myProposal.status)} /></View>
            <Text style={s.body}>{myProposal.message}</Text>
            <Text style={s.sub}>${myProposal.price}  {'•'}  {myProposal.deliveryDays} days</Text>
          </Card>
        )}

        {!sample && !isOwner && !myProposal && isOpen && (
          <Card>
            <Text style={s.h}>Submit a proposal</Text>
            <Field label="Message" required value={message} onChangeText={setMessage} multiline placeholder="Introduce yourself and explain your approach" />
            <View style={{ flexDirection: 'row' }}>
              <Field label="Your price ($)" required value={price} onChangeText={setPrice} keyboardType="numeric" style={{ flex: 1, marginRight: 8 }} />
              <Field label="Delivery (days)" required value={days} onChangeText={setDays} keyboardType="numeric" style={{ flex: 1, marginLeft: 8 }} />
            </View>
            <Btn title={busy ? 'Sending...' : 'Submit proposal'} onPress={submitProposal} disabled={busy} />
            <Text style={[s.sub, { marginTop: 10 }]}>Payment is arranged directly with the client. SchulLoop does not hold funds.</Text>
          </Card>
        )}

        {!sample && !isOwner && !myProposal && !isOpen && <Text style={s.note}>This project is no longer accepting proposals.</Text>}

        {isOwner && (
          <>
            <SectionTitle title={`Proposals (${proposals.length})`} />
            {proposals.length === 0 ? <Text style={s.empty}>No proposals yet.</Text> : proposals.map(pr => (
              <Card key={pr._id}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Initials name={pr.freelancer?.name} size={40} />
                  <View style={{ flex: 1, marginLeft: 10 }}><Text style={s.name}>{pr.freelancer?.name || 'Freelancer'}</Text><Text style={s.sub}>{pr.freelancer?.title || ''}</Text></View>
                  <StatusPill label={statusLabel(pr.status)} tone={statusTone(pr.status)} />
                </View>
                <Text style={[s.body, { marginTop: 10 }]}>{pr.message}</Text>
                <Text style={s.factValue}>${pr.price}  {'•'}  {pr.deliveryDays} days</Text>
                {isOpen && pr.status === 'submitted' ? <Btn title="Select" onPress={() => selectProposal(pr)} style={{ marginTop: 10, paddingVertical: 10 }} /> : null}
              </Card>
            ))}
            {(project.status === 'open' || project.status === 'in_progress') && (
              <View style={{ marginHorizontal: 16 }}>
                {project.status === 'in_progress' && <Btn title="Mark completed" icon="checkmark-circle-outline" onPress={() => changeStatus('completed', 'Mark completed')} style={{ marginBottom: 10 }} />}
                <TouchableOpacity style={s.cancel} onPress={() => changeStatus('cancelled', 'Cancel project')}><Text style={s.cancelText}>Cancel project</Text></TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  title: { fontSize: 17, fontWeight: '800', color: C.text },
  sub: { fontSize: 12, color: C.muted, marginTop: 4 },
  name: { fontSize: 14, fontWeight: '800', color: C.text },
  h: { fontSize: 14, fontWeight: '800', color: C.text, marginTop: 14, marginBottom: 6 },
  body: { fontSize: 13, color: C.text, lineHeight: 19 },
  facts: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  fact: { flex: 1 },
  factLabel: { fontSize: 11, color: C.muted, marginBottom: 4 },
  factValue: { fontSize: 13, fontWeight: '800', color: C.text, marginTop: 4 },
  skillRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },
  skill: { backgroundColor: C.blueSoft, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, marginRight: 6, marginBottom: 6 },
  skillText: { color: C.blue, fontSize: 11, fontWeight: '700' },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  empty: { textAlign: 'center', color: C.muted, marginVertical: 24, paddingHorizontal: 24 },
  note: { color: C.amber, marginHorizontal: 16, marginBottom: 12, fontSize: 12, fontWeight: '700' },
  cancel: { borderWidth: 1.5, borderColor: C.red, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  cancelText: { color: C.red, fontWeight: '800', fontSize: 15 },
});
