import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { BlueHeader, Btn, C, Card, Field } from '../../shared/ui/kit';
import { api } from './freelanceApi';

export const FreelancerProfileScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exists, setExists] = useState(false);
  const [title, setTitle] = useState('');
  const [skills, setSkills] = useState('');
  const [rate, setRate] = useState('');
  const [available, setAvailable] = useState(true);
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [portfolio, setPortfolio] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const { freelancer } = await api('/me/freelancer');
        if (freelancer) {
          setExists(true);
          setTitle(freelancer.title || '');
          setSkills((freelancer.skills || []).join(', '));
          setRate(freelancer.rate || '');
          setAvailable(freelancer.availability !== 'busy');
          setBio(freelancer.bio || '');
          setLocation(freelancer.location || '');
          setPortfolio(freelancer.portfolio || []);
        }
      } catch (e) { Alert.alert('Could not load profile', e.message); }
      finally { setLoading(false); }
    })();
  }, []);

  const setLink = (i, key, value) => setPortfolio(list => list.map((l, idx) => idx === i ? { ...l, [key]: value } : l));

  const save = async () => {
    if (!title.trim()) return Alert.alert('Missing title', 'Enter a professional title, for example "Web Developer".');
    const skillList = skills.split(',').map(x => x.trim()).filter(Boolean);
    if (!skillList.length) return Alert.alert('Missing skills', 'Add at least one skill, separated by commas.');
    setSaving(true);
    try {
      await api('/me/freelancer', 'PUT', {
        title: title.trim(), skills: skillList, rate: rate.trim(), availability: available ? 'available' : 'busy',
        bio: bio.trim(), location: location.trim(), portfolio: portfolio.filter(l => l.url.trim()).map(l => ({ title: l.title.trim(), url: l.url.trim() })),
      });
      Alert.alert('Saved', 'Your freelancer profile is live.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e) { Alert.alert('Could not save', e.message); }
    finally { setSaving(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <BlueHeader title={exists ? 'Edit Freelancer Profile' : 'Become a Freelancer'} onBack={() => navigation.goBack()} />
      {loading ? <ActivityIndicator color={C.blue} style={{ marginTop: 40 }} /> : (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <Field label="Professional title" required value={title} onChangeText={setTitle} placeholder="e.g. Graphic Designer" />
          <Field label="Skills (comma separated)" required value={skills} onChangeText={setSkills} placeholder="Figma, Logo design, Branding" />
          <Field label="Rate" value={rate} onChangeText={setRate} placeholder="e.g. $15/hr or $100 per project" />
          <Field label="Location" value={location} onChangeText={setLocation} placeholder="City, country" />
          <Field label="Bio" value={bio} onChangeText={setBio} multiline placeholder="Tell clients about your experience" style={{ marginBottom: 14 }} />
          <Card style={s.switchCard}>
            <View style={{ flex: 1 }}><Text style={s.label}>Available for work</Text><Text style={s.hint}>{available ? 'Shown as Available' : 'Shown as Busy'}</Text></View>
            <Switch value={available} onValueChange={setAvailable} trackColor={{ true: C.blue }} />
          </Card>
          <Text style={[s.label, { marginTop: 8, marginBottom: 8 }]}>Portfolio links</Text>
          {portfolio.map((l, i) => (
            <Card key={i} style={s.linkCard}>
              <Field label="Title" value={l.title} onChangeText={v => setLink(i, 'title', v)} placeholder="Project name" />
              <Field label="URL" value={l.url} onChangeText={v => setLink(i, 'url', v)} placeholder="https://" autoCapitalize="none" keyboardType="url" style={{ marginBottom: 6 }} />
              <TouchableOpacity onPress={() => setPortfolio(list => list.filter((_, idx) => idx !== i))}><Text style={{ color: C.red, fontWeight: '700' }}>Remove</Text></TouchableOpacity>
            </Card>
          ))}
          <Btn title="Add portfolio link" icon="add" variant="outline" onPress={() => setPortfolio(list => [...list, { title: '', url: '' }])} style={{ marginBottom: 20 }} />
          <Btn title={saving ? 'Saving...' : exists ? 'Save profile' : 'Activate profile'} onPress={save} disabled={saving} />
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
};

const s = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '700', color: C.text },
  hint: { fontSize: 12, color: C.muted, marginTop: 2 },
  switchCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 0 },
  linkCard: { marginHorizontal: 0 },
});
