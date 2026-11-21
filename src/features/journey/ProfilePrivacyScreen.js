import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import apiService from '../../shared/services/apiService';
import { BlueHeader, Btn, C, Card, Chip, MAIN_BAR, ModuleBar, SectionTitle, k } from '../../shared/ui/kit';

// Home may read this key to decide whether to personalise recommendations (default: on).
export const PERSONALIZATION_KEY = 'schulloop_personalization';

const LEVELS = [
  { key: 'public', label: 'Public' },
  { key: 'connections', label: 'Connections' },
  { key: 'private', label: 'Private' },
];
const ROWS = [
  { key: 'education', title: 'Education', text: 'Schools, courses and qualifications you list.' },
  { key: 'experience', title: 'Experience', text: 'Jobs, projects and roles you list.' },
  { key: 'skills', title: 'Skills', text: 'Skills shown on your profile.' },
  { key: 'contact', title: 'Contact details', text: 'Your email and phone number.' },
];

export const ProfilePrivacyScreen = ({ navigation }) => {
  const [vis, setVis] = useState(null);
  const [saved, setSaved] = useState(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [personalise, setPersonalise] = useState(true);

  const load = useCallback(async () => {
    setError('');
    try {
      const r = await apiService.getJourney();
      const v = (r.journey || {}).visibility || {};
      setVis(v); setSaved(v);
    } catch (e) { setError(e.message || 'Could not load your privacy settings.'); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    AsyncStorage.getItem(PERSONALIZATION_KEY).then(v => { if (v !== null) setPersonalise(v === 'true'); }).catch(() => {});
  }, []);

  const dirty = vis && saved && ROWS.some(r => vis[r.key] !== saved[r.key]);

  const save = async () => {
    setSaving(true); setStatus('');
    try {
      const r = await apiService.updateJourney({ visibility: vis });
      const v = ((r.journey || {}).visibility) || vis;
      setVis(v); setSaved(v); setStatus('Saved');
    } catch (e) { setStatus(e.message || 'Could not save. Please try again.'); }
    setSaving(false);
  };

  const togglePersonalise = (v) => {
    setPersonalise(v);
    AsyncStorage.setItem(PERSONALIZATION_KEY, String(v)).catch(() => {});
  };

  return (
    <View style={k.screen}>
      <BlueHeader title="Profile and Privacy" subtitle="Choose who can see what" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ paddingTop: 16, paddingBottom: 28 }} keyboardShouldPersistTaps="handled">
        {!vis && !error ? <ActivityIndicator color={C.blue} style={{ marginTop: 24 }} /> : null}
        {error ? <Card><Text style={{ color: C.red, marginBottom: 10 }}>{error}</Text><Btn title="Retry" onPress={load} /></Card> : null}
        {vis ? (
          <>
            <SectionTitle title="Who can see my profile" />
            {ROWS.map(r => (
              <Card key={r.key}>
                <Text style={s.title}>{r.title}</Text>
                <Text style={s.sub}>{r.text}</Text>
                <View style={s.chips}>
                  {LEVELS.map(l => <Chip key={l.key} label={l.label} active={vis[r.key] === l.key} onPress={() => { setStatus(''); setVis({ ...vis, [r.key]: l.key }); }} style={{ marginRight: 8 }} />)}
                </View>
              </Card>
            ))}
            <View style={{ paddingHorizontal: 16 }}>
              {saving ? <ActivityIndicator color={C.blue} /> : <Btn title="Save privacy settings" onPress={save} disabled={!dirty} />}
              {status ? <Text style={[s.status, status !== 'Saved' && { color: C.red }]}>{status}</Text> : null}
            </View>
          </>
        ) : null}

        <SectionTitle title="Personalisation" />
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={s.title}>Use my profile and activity to personalise recommendations</Text>
              <Text style={s.sub}>Stored on this device and used to tailor what you see on Home.</Text>
            </View>
            <Switch value={personalise} onValueChange={togglePersonalise} trackColor={{ true: C.blue, false: C.border }} accessibilityLabel="Personalise recommendations" />
          </View>
        </Card>
      </ScrollView>
      <ModuleBar items={MAIN_BAR} active="profile" navigation={navigation} />
    </View>
  );
};

const s = StyleSheet.create({
  title: { fontSize: 15, fontWeight: '800', color: C.text },
  sub: { fontSize: 12, color: C.muted, marginTop: 3, lineHeight: 17 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },
  status: { color: C.green, fontSize: 13, marginTop: 10, textAlign: 'center' },
});
