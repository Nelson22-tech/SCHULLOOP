// Become a mentor / edit mentor profile, including weekly availability.
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { BlueHeader, Btn, C, Card, Field } from '../../shared/ui/kit';
import apiService from '../../shared/services/apiService';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export const MentorSetupScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exists, setExists] = useState(false);
  const [f, setF] = useState({ headline: '', bio: '', subjects: '', languages: 'English', country: '', hourlyRate: '', trialRate: '', experienceYears: '', education: '' });
  const [active, setActive] = useState(true);
  const [windows, setWindows] = useState({}); // day -> {on,start,end}

  useEffect(() => {
    (async () => {
      try {
        const { mentor } = await apiService.getMyMentorProfile();
        if (mentor) {
          setExists(true);
          setF({
            headline: mentor.headline || '', bio: mentor.bio || '', subjects: (mentor.subjects || []).join(', '), languages: (mentor.languages || []).join(', '),
            country: mentor.country || '', hourlyRate: String(mentor.hourlyRate ?? ''), trialRate: mentor.trialRate != null ? String(mentor.trialRate) : '',
            experienceYears: String(mentor.experienceYears || ''), education: mentor.education || '',
          });
          setActive(mentor.status !== 'paused');
          const w = {};
          (mentor.availability || []).forEach((a) => { w[a.day] = { on: true, start: a.start, end: a.end }; });
          setWindows(w);
        }
      } catch (e) { Alert.alert('Could not load', e.message || 'Please try again.'); }
      finally { setLoading(false); }
    })();
  }, []);

  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }));
  const toggleDay = (d) => setWindows((p) => ({ ...p, [d]: p[d]?.on ? { ...p[d], on: false } : { on: true, start: p[d]?.start || '09:00', end: p[d]?.end || '17:00' } }));
  const setTime = (d, k, v) => setWindows((p) => ({ ...p, [d]: { ...p[d], [k]: v } }));

  const save = async () => {
    const availability = [];
    for (let d = 0; d < 7; d += 1) {
      const w = windows[d];
      if (w?.on) {
        if (!HHMM.test(w.start) || !HHMM.test(w.end) || w.start >= w.end) { Alert.alert('Check availability', `${DAYS[d]}: use 24-hour times like 09:00 and 17:00, with the end after the start.`); return; }
        availability.push({ day: d, start: w.start, end: w.end });
      }
    }
    setSaving(true);
    try {
      await apiService.saveMyMentorProfile({ ...f, availability, status: active ? 'active' : 'paused', utcOffsetMinutes: -new Date().getTimezoneOffset() });
      Alert.alert('Saved', exists ? 'Your mentor profile was updated.' : 'You are now listed as a mentor!', [{ text: 'OK', onPress: () => navigation.navigate('MyLessons') }]);
      setExists(true);
    } catch (e) { Alert.alert('Could not save', e.message || 'Please try again.'); }
    finally { setSaving(false); }
  };

  const goBack = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Mentors'));
  if (loading) return <View style={s.root}><BlueHeader title="Mentor profile" onBack={goBack} /><ActivityIndicator color={C.blue} style={{ marginTop: 40 }} /></View>;

  return (
    <View style={s.root}>
      <BlueHeader title={exists ? 'Edit mentor profile' : 'Become a mentor'} subtitle="Teach 1-on-1 and earn from every lesson" onBack={goBack} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <Card>
          <Field label="Headline" required value={f.headline} onChangeText={set('headline')} placeholder="e.g. Maths graduate helping students pass WAEC" maxLength={120} />
          <Field label="About you" value={f.bio} onChangeText={set('bio')} placeholder="Your experience and how you teach" multiline style={{ minHeight: 80 }} />
          <Field label="Subjects (comma separated)" required value={f.subjects} onChangeText={set('subjects')} placeholder="Mathematics, Exam prep" />
          <Field label="Languages (comma separated)" value={f.languages} onChangeText={set('languages')} />
          <Field label="Country" value={f.country} onChangeText={set('country')} />
          <Field label="Education" value={f.education} onChangeText={set('education')} placeholder="e.g. BSc Mathematics, University of Buea" />
          <Field label="Years of experience" value={f.experienceYears} onChangeText={(v) => set('experienceYears')(v.replace(/[^0-9]/g, ''))} keyboardType="numeric" />
        </Card>

        <Card>
          <Text style={s.h}>Pricing (USD)</Text>
          <Field label="Hourly rate" required value={f.hourlyRate} onChangeText={(v) => set('hourlyRate')(v.replace(/[^0-9.]/g, ''))} keyboardType="numeric" placeholder="e.g. 10" />
          <Field label="30-minute trial price (leave empty for half the hourly rate)" value={f.trialRate} onChangeText={(v) => set('trialRate')(v.replace(/[^0-9.]/g, ''))} keyboardType="numeric" />
          <Text style={s.hint}>A small platform commission is deducted from each paid lesson.</Text>
        </Card>

        <Card>
          <Text style={s.h}>Weekly availability</Text>
          <Text style={s.hint}>Times are in your local time. Students see them converted to theirs.</Text>
          {DAYS.map((name, d) => {
            const w = windows[d];
            return (
              <View key={name} style={s.dayRow}>
                <TouchableOpacity onPress={() => toggleDay(d)} style={[s.dayChip, w?.on && s.dayChipOn]}>
                  <Text style={[s.dayChipText, w?.on && { color: '#fff' }]}>{name}</Text>
                </TouchableOpacity>
                {w?.on ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Field label="" value={w.start} onChangeText={(v) => setTime(d, 'start', v)} style={s.time} maxLength={5} />
                    <Text style={{ marginHorizontal: 6, color: C.muted }}>to</Text>
                    <Field label="" value={w.end} onChangeText={(v) => setTime(d, 'end', v)} style={s.time} maxLength={5} />
                  </View>
                ) : <Text style={s.hint}>Not available</Text>}
              </View>
            );
          })}
        </Card>

        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={s.h}>Accepting bookings</Text>
              <Text style={s.hint}>Turn off to hide your profile temporarily.</Text>
            </View>
            <Switch value={active} onValueChange={setActive} />
          </View>
        </Card>

        <Btn title={saving ? 'Saving...' : exists ? 'Save changes' : 'Publish mentor profile'} onPress={save} disabled={saving} />
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  h: { fontSize: 16, fontWeight: '800', color: C.text, marginBottom: 6 },
  hint: { color: C.muted, fontSize: 12, lineHeight: 17 },
  dayRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  dayChip: { width: 56, alignItems: 'center', paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: '#fff', marginRight: 10 },
  dayChipOn: { backgroundColor: C.blue, borderColor: C.blue },
  dayChipText: { fontWeight: '800', color: C.text, fontSize: 13 },
  time: { flex: 1, marginBottom: 0 },
});
