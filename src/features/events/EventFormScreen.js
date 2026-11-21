import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BlueHeader, Btn, C, Card, ChipRow, Field } from '../../shared/ui/kit';
import apiService from '../../shared/services/apiService';
import { EVENT_CATEGORIES, parseLocal, toDateInput, toTimeInput } from './eventUi';

export const EventFormScreen = ({ navigation, route }) => {
  const existing = route?.params?.event;
  const start0 = existing ? new Date(existing.startAt) : new Date(Date.now() + 24 * 3600 * 1000);
  const end0 = existing?.endAt ? new Date(existing.endAt) : null;
  const [f, setF] = useState({
    title: existing?.title || '', description: existing?.description || '', category: existing?.category || 'General', mode: existing?.mode || 'online',
    location: existing?.location || '', link: existing?.link || '', capacity: existing?.capacity ? String(existing.capacity) : '',
    date: toDateInput(start0), time: toTimeInput(start0), endTime: end0 ? toTimeInput(end0) : '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }));
  const goBack = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Events'));

  const save = async () => {
    const startAt = parseLocal(f.date, f.time);
    if (!startAt) { Alert.alert('Check the date', 'Use the date format YYYY-MM-DD (for example 2026-12-05) and 24-hour time like 15:30.'); return; }
    let endAt = null;
    if (f.endTime.trim()) {
      endAt = parseLocal(f.date, f.endTime);
      if (!endAt || endAt <= startAt) { Alert.alert('Check the end time', 'The end time must be after the start time, in 24-hour format like 17:00.'); return; }
    }
    setSaving(true);
    try {
      const body = { title: f.title, description: f.description, category: f.category === 'All' ? 'General' : f.category, mode: f.mode, location: f.location, link: f.link, capacity: f.capacity, startAt: startAt.toISOString(), endAt: endAt ? endAt.toISOString() : null };
      if (existing) await apiService.updateEvent(existing.id, body); else await apiService.createEvent(body);
      Alert.alert(existing ? 'Event updated' : 'Event published', 'People can now find and join your event.', [{ text: 'OK', onPress: () => navigation.navigate('Events') }]);
    } catch (e) { Alert.alert('Could not save', e.message || 'Please try again.'); }
    finally { setSaving(false); }
  };

  return (
    <View style={s.root}>
      <BlueHeader title={existing ? 'Edit event' : 'Host an event'} subtitle="Share a workshop, meetup or webinar" onBack={goBack} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <Card>
          <Field label="Title" required value={f.title} onChangeText={set('title')} maxLength={120} placeholder="e.g. WAEC revision workshop" />
          <Field label="Description" value={f.description} onChangeText={set('description')} multiline style={{ minHeight: 80 }} placeholder="What will happen and who is it for?" />
          <Text style={s.label}>Category</Text>
          <ChipRow items={EVENT_CATEGORIES.filter((c) => c !== 'All')} value={f.category} onChange={set('category')} style={{ marginHorizontal: -16 }} />
          <Text style={s.label}>Format</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
            {[['online', 'Online'], ['in_person', 'In person']].map(([k, l]) => (
              <TouchableOpacity key={k} onPress={() => set('mode')(k)} style={[s.mode, f.mode === k && s.modeOn]}><Text style={[s.modeText, f.mode === k && { color: '#fff' }]}>{l}</Text></TouchableOpacity>
            ))}
          </View>
          {f.mode === 'in_person' ? <Field label="Location" required value={f.location} onChangeText={set('location')} placeholder="Venue and city" /> : null}
          <Field label={f.mode === 'online' ? 'Meeting link (shown to people who RSVP)' : 'Link (optional)'} value={f.link} onChangeText={set('link')} autoCapitalize="none" keyboardType="url" placeholder="https://..." />
        </Card>
        <Card>
          <Text style={s.h}>Date & time (your local time)</Text>
          <Field label="Date (YYYY-MM-DD)" required value={f.date} onChangeText={set('date')} maxLength={10} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Field label="Starts (HH:MM)" required value={f.time} onChangeText={set('time')} maxLength={5} style={{ flex: 1 }} />
            <Field label="Ends (optional)" value={f.endTime} onChangeText={set('endTime')} maxLength={5} style={{ flex: 1 }} />
          </View>
          <Field label="Max attendees (empty = unlimited)" value={f.capacity} onChangeText={(v) => set('capacity')(v.replace(/[^0-9]/g, ''))} keyboardType="numeric" />
        </Card>
        <Btn title={saving ? 'Saving...' : existing ? 'Save changes' : 'Publish event'} onPress={save} disabled={saving} />
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  h: { fontSize: 16, fontWeight: '800', color: C.text, marginBottom: 10 },
  label: { fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 6 },
  mode: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: '#fff' },
  modeOn: { backgroundColor: C.blue, borderColor: C.blue },
  modeText: { fontWeight: '800', color: C.text },
});
