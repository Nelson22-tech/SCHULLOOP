import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BlueHeader, Btn, C, Card, ListRow, SectionTitle, k } from '../../shared/ui/kit';
import { CAPABILITY_LABELS, STAGES, fetchCapabilities, fetchJourney } from './journeyHelpers';

export const MyJourneyScreen = ({ navigation }) => {
  const [journey, setJourney] = useState(null);
  const [caps, setCaps] = useState([]);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    setError('');
    try {
      const [j, c] = await Promise.all([fetchJourney(), fetchCapabilities().catch(() => [])]);
      setJourney(j); setCaps(c);
    } catch (e) { setError(e.message || 'Could not load your journey.'); }
    setRefreshing(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => navigation.addListener('focus', () => load()), [navigation, load]);

  const edit = (section) => () => navigation.navigate('JourneyEdit', { section });
  // A stage is "reached" when it is the current stage or the account holds that capability.
  const reached = (key) => journey && (journey.stage === key || caps.includes(key));
  const n = (a) => (a || []).length;

  const rows = journey ? [
    { icon: 'person', title: 'Personal Information', subtitle: 'Name, contact and about you', onPress: () => navigation.navigate('GraduateProfile') },
    { icon: 'school', title: 'Education', subtitle: `${n(journey.education)} entries`, onPress: edit('education') },
    { icon: 'ribbon', title: 'Qualifications', subtitle: `${n(journey.qualifications)} entries`, onPress: edit('qualifications') },
    { icon: 'construct', title: 'Skills & Experience', subtitle: `${n(journey.skills)} skills · ${n(journey.experience)} roles`, onPress: edit('skills') },
    { icon: 'trending-up', title: 'Career Progress', subtitle: journey.careerGoals ? journey.careerGoals : 'Set your goals and current stage', onPress: edit('careerGoals') },
  ] : [];

  return (
    <View style={k.screen}>
      <BlueHeader title="My Journey" subtitle="One account for every stage of your path" onBack={() => navigation.goBack()} />
      {!journey && !error ? <ActivityIndicator color={C.blue} style={{ marginTop: 40 }} /> : null}
      {error ? <Card style={{ marginTop: 16 }}><Text style={{ color: C.red, marginBottom: 10 }}>{error}</Text><Btn title="Retry" onPress={() => load()} /></Card> : null}
      {journey ? (
        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />} contentContainerStyle={{ paddingTop: 16, paddingBottom: 28 }}>
          <Card>
            <View style={{ flexDirection: 'row' }}>
              {STAGES.map(st => {
                const current = journey.stage === st.key; const done = reached(st.key);
                return (
                  <View key={st.key} style={{ flex: 1, alignItems: 'center' }}>
                    <View style={[s.dot, done && { backgroundColor: C.blueSoft, borderColor: C.blue }, current && { backgroundColor: C.blue, borderColor: C.blue }]}>
                      <Ionicons name={st.icon} size={18} color={current ? '#fff' : done ? C.blue : C.muted} />
                    </View>
                    <Text style={[s.stage, done && { color: C.blue, fontWeight: '800' }]} numberOfLines={1}>{st.label}</Text>
                  </View>
                );
              })}
            </View>
            <TouchableOpacity onPress={edit('stage')}><Text style={[k.link, { marginTop: 12, textAlign: 'center' }]}>Change my current stage</Text></TouchableOpacity>
          </Card>

          <Card>
            <Text style={s.cardTitle}>Journey summary</Text>
            <Text style={s.cardText}>Current stage: {(STAGES.find(x => x.key === journey.stage) || {}).label || 'Not set'}</Text>
            <Text style={s.cardText}>{n(journey.education)} education · {n(journey.qualifications)} qualifications · {n(journey.skills)} skills · {n(journey.experience)} experience</Text>
            {caps.length ? <Text style={s.cardText}>Capabilities: {caps.map(c => CAPABILITY_LABELS[c] || c).join(', ')}</Text> : null}
          </Card>

          <SectionTitle title="My Journey" />
          <Card style={{ paddingVertical: 2, paddingHorizontal: 14 }}>
            {rows.map((r, i) => <ListRow key={r.title} icon={r.icon} title={r.title} subtitle={r.subtitle} onPress={r.onPress} last={i === rows.length - 1} />)}
          </Card>
          <Card style={{ paddingVertical: 2, paddingHorizontal: 14 }}>
            <ListRow icon="layers" title="Additional Capabilities" subtitle="Freelancer, service provider, employer and more" onPress={() => navigation.navigate('Capabilities')} />
            <ListRow icon="lock-closed" title="Profile and Privacy" subtitle="Choose who sees what" onPress={() => navigation.navigate('ProfilePrivacy')} last />
          </Card>
        </ScrollView>
      ) : null}
    </View>
  );
};

const s = StyleSheet.create({
  dot: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: C.blueLine, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  stage: { fontSize: 10, color: C.muted, marginTop: 6 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: C.text, marginBottom: 6 },
  cardText: { fontSize: 13, color: C.muted, marginTop: 3, lineHeight: 18 },
});
