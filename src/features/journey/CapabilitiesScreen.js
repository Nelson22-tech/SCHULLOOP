import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import apiService from '../../shared/services/apiService';
import { BlueHeader, Btn, C, Card, IconTile, MAIN_BAR, ModuleBar, k } from '../../shared/ui/kit';

const CAPS = [
  { key: 'student', label: 'Student', icon: 'school', text: 'Find schools, apply and keep track of your studies.' },
  { key: 'graduate', label: 'Graduate', icon: 'ribbon', text: 'Show your qualifications and graduate profile.' },
  { key: 'job_seeker', label: 'Job Seeker', icon: 'search', text: 'Search and apply for jobs and careers.' },
  { key: 'freelancer', label: 'Freelancer', icon: 'laptop', text: 'Offer your skills and send proposals on projects.', action: { title: 'Set up freelancer profile', route: 'FreelancerProfile' } },
  { key: 'service_provider', label: 'Service Provider', icon: 'construct', text: 'List local services and receive requests.', action: { title: 'Create a service listing', route: 'ServiceListingForm' } },
  { key: 'employer', label: 'Employer', icon: 'business', text: 'Post jobs and review applicants.', action: { title: 'Post a job', route: 'PostJob' } },
];

export const CapabilitiesScreen = ({ navigation }) => {
  const [active, setActive] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const r = await apiService.getCapabilities();
      setActive(r.capabilities || []);
    } catch (e) { setError(e.message || 'Could not load your capabilities.'); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggle = async (key, on) => {
    if (busy) return;
    const before = active;
    setMessage(''); setBusy(key);
    // Optimistic update, rolled back if the server refuses.
    setActive(on ? [...before, key] : before.filter(c => c !== key));
    try {
      const r = await apiService.updateCapabilities(on ? { add: [key] } : { remove: [key] });
      if (Array.isArray(r.capabilities)) setActive(r.capabilities);
    } catch (e) {
      setActive(before);
      setMessage(e.message || 'Could not update this capability. Please try again.');
    }
    setBusy('');
  };

  const isOn = (key) => active.includes(key);

  return (
    <View style={k.screen}>
      <BlueHeader title="Additional Capabilities" subtitle="One account, many ways to use SchulLoop" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ paddingTop: 16, paddingBottom: 28 }}>
        <Card>
          <Text style={s.info}>You have one account with multiple capabilities. Activating a capability never changes your account type or removes others.</Text>
        </Card>
        {loading ? <ActivityIndicator color={C.blue} style={{ marginTop: 24 }} /> : null}
        {error ? <Card><Text style={{ color: C.red, marginBottom: 10 }}>{error}</Text><Btn title="Retry" onPress={load} /></Card> : null}
        {message ? <Text style={s.warn}>{message}</Text> : null}
        {!loading && !error ? (
          <>
            {CAPS.map(c => (
              <Card key={c.key}>
                <View style={s.row}>
                  <IconTile name={c.icon} />
                  <View style={{ flex: 1, marginHorizontal: 12 }}>
                    <Text style={s.title}>{c.label}</Text>
                    <Text style={s.sub}>{c.text}</Text>
                  </View>
                  <Switch
                    value={isOn(c.key)}
                    disabled={!!busy}
                    onValueChange={(v) => toggle(c.key, v)}
                    trackColor={{ true: C.blue, false: C.border }}
                    accessibilityLabel={`${isOn(c.key) ? 'Deactivate' : 'Activate'} ${c.label}`}
                  />
                </View>
                {isOn(c.key) && c.action ? (
                  <TouchableOpacity onPress={() => navigation.navigate(c.action.route)} style={s.action}>
                    <Text style={k.link}>{c.action.title}</Text>
                    <Ionicons name="chevron-forward" size={16} color={C.blue} />
                  </TouchableOpacity>
                ) : null}
              </Card>
            ))}
            <Card>
              <View style={s.row}>
                <IconTile name="shield-checkmark" />
                <View style={{ flex: 1, marginHorizontal: 12 }}>
                  <Text style={s.title}>School Representative</Text>
                  <Text style={s.sub}>Granted through school verification.</Text>
                </View>
                <Text style={[s.badge, isOn('school_representative') && { color: C.green }]}>{isOn('school_representative') ? 'Active' : 'Not granted'}</Text>
              </View>
            </Card>
          </>
        ) : null}
      </ScrollView>
      <ModuleBar items={MAIN_BAR} active="profile" navigation={navigation} />
    </View>
  );
};

const s = StyleSheet.create({
  info: { fontSize: 13, color: C.muted, lineHeight: 19 },
  warn: { color: C.red, fontSize: 13, marginHorizontal: 16, marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 15, fontWeight: '800', color: C.text },
  sub: { fontSize: 12, color: C.muted, marginTop: 2, lineHeight: 17 },
  action: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border },
  badge: { fontSize: 12, fontWeight: '700', color: C.muted },
});
