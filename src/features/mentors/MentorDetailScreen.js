// Mentor profile + lesson booking (trial / 30 / 60 min), then secure checkout.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { BlueHeader, Btn, C, Card, StatusPill } from '../../shared/ui/kit';
import apiService from '../../shared/services/apiService';
import { MentorAvatar, Stars, fmtDay, fmtTime, money } from './mentorUi';

const LESSON_TYPES = [
  { key: 'trial', label: 'Trial', duration: 30, isTrial: true },
  { key: '30', label: '30 min', duration: 30, isTrial: false },
  { key: '60', label: '60 min', duration: 60, isTrial: false },
];

export const MentorDetailScreen = ({ navigation, route }) => {
  const mentorId = route?.params?.mentorId;
  const [mentor, setMentor] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [lesson, setLesson] = useState(LESSON_TYPES[0]);
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [day, setDay] = useState('');
  const [slot, setSlot] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiService.getMentor(mentorId);
        setMentor(data.mentor); setReviews(data.reviews || []);
      } catch (e) { setError(e.message || 'Could not load this mentor'); }
      finally { setLoading(false); }
    })();
  }, [mentorId]);

  const loadSlots = useCallback(async () => {
    setSlotsLoading(true); setSlot(''); setDay('');
    try {
      const data = await apiService.getMentorSlots(mentorId, lesson.duration);
      setSlots(data.slots || []);
      if (data.slots?.length) setDay(new Date(data.slots[0]).toDateString());
    } catch (e) { setSlots([]); }
    finally { setSlotsLoading(false); }
  }, [mentorId, lesson.duration]);

  useEffect(() => { if (mentor) loadSlots(); }, [mentor, loadSlots]);

  const days = useMemo(() => {
    const map = new Map();
    slots.forEach((iso) => { const k = new Date(iso).toDateString(); if (!map.has(k)) map.set(k, []); map.get(k).push(iso); });
    return [...map.entries()];
  }, [slots]);
  const daySlots = (days.find(([k]) => k === day) || [null, []])[1];

  const price = !mentor ? 0 : lesson.isTrial ? mentor.trialRate : Math.round((mentor.hourlyRate * lesson.duration) / 60 * 100) / 100;

  const goBack = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Mentors'));

  const book = async () => {
    if (!slot) { Alert.alert('Choose a time', 'Pick a day and a time slot first.'); return; }
    setBusy(true);
    try {
      const res = await apiService.createMentorBooking(mentorId, { startAt: slot, durationMin: lesson.duration, isTrial: lesson.isTrial, note: note.trim() });
      const booking = res.booking;
      if (res.requiresPayment) {
        const redirectUrl = Linking.createURL('mentor-payment');
        const checkout = await apiService.startMentorCheckout(booking._id || booking.id, redirectUrl);
        const result = await WebBrowser.openAuthSessionAsync(checkout.checkoutUrl, redirectUrl);
        const returned = result?.url ? Linking.parse(result.url) : null;
        const q = returned?.queryParams || {};
        const txId = q.transaction_id || q.transactionId;
        if (result.type === 'success' && q.status !== 'cancelled' && txId) {
          await apiService.verifyMentorPayment(txId);
          Alert.alert('Lesson booked!', 'Payment received. Your lesson is confirmed.', [{ text: 'View my lessons', onPress: () => navigation.navigate('MyLessons') }]);
        } else {
          Alert.alert('Payment not completed', 'Your slot is held for 15 minutes. You can pay again from My lessons.', [{ text: 'OK', onPress: () => navigation.navigate('MyLessons') }]);
        }
      } else {
        Alert.alert('Lesson booked!', 'Your lesson is confirmed.', [{ text: 'View my lessons', onPress: () => navigation.navigate('MyLessons') }]);
      }
      loadSlots();
    } catch (e) { Alert.alert('Could not book', e.message || 'Please try again.'); loadSlots(); }
    finally { setBusy(false); }
  };

  const message = async () => {
    try {
      const res = await apiService.startConversation(mentor.userId);
      navigation.navigate('Chat', { conversationId: res.conversation._id || res.conversation.id, title: mentor.name });
    } catch (e) { Alert.alert('Could not open chat', e.message || 'Please try again.'); }
  };

  if (loading) return <View style={s.root}><BlueHeader title="Mentor" onBack={goBack} /><ActivityIndicator color={C.blue} style={{ marginTop: 40 }} /></View>;
  if (error || !mentor) return <View style={s.root}><BlueHeader title="Mentor" onBack={goBack} /><Card><Text style={{ color: C.red }}>{error || 'Mentor not found'}</Text></Card></View>;

  return (
    <View style={s.root}>
      <BlueHeader title={mentor.name} subtitle={mentor.headline} onBack={goBack} />
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        <Card style={{ marginTop: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MentorAvatar name={mentor.name} uri={mentor.avatarUrl} size={72} />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={s.name}>{mentor.name}</Text>
              <Stars value={mentor.ratingAvg} count={mentor.reviewCount} size={15} />
              <Text style={s.meta}>{mentor.lessonsCompleted} lessons taught{mentor.experienceYears ? ` · ${mentor.experienceYears} yrs experience` : ''}</Text>
              {mentor.country ? <Text style={s.meta}>{mentor.country}</Text> : null}
            </View>
          </View>
          <View style={s.pills}>{mentor.subjects.map((x) => <StatusPill key={x} label={x} tone="blue" />)}</View>
          {mentor.languages.length ? <Text style={[s.meta, { marginTop: 10 }]}>Speaks: {mentor.languages.join(', ')}</Text> : null}
          {mentor.education ? <Text style={[s.meta, { marginTop: 4 }]}>Education: {mentor.education}</Text> : null}
          <Btn title="Message mentor" variant="outline" onPress={message} style={{ marginTop: 14 }} />
        </Card>

        {mentor.bio ? <Card><Text style={s.h}>About</Text><Text style={s.body}>{mentor.bio}</Text></Card> : null}

        <Card>
          <Text style={s.h}>Book a lesson</Text>
          <View style={s.typeRow}>
            {LESSON_TYPES.map((t) => {
              const active = lesson.key === t.key;
              const p = t.isTrial ? mentor.trialRate : Math.round((mentor.hourlyRate * t.duration) / 60 * 100) / 100;
              return (
                <TouchableOpacity key={t.key} onPress={() => setLesson(t)} style={[s.type, active && s.typeOn]}>
                  <Text style={[s.typeLabel, active && { color: '#fff' }]}>{t.label}</Text>
                  <Text style={[s.typePrice, active && { color: '#fff' }]}>{money(p, mentor.currency)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={s.meta}>Times are shown in your local time. Free cancellation up to 24 hours before the lesson.</Text>

          {slotsLoading ? <ActivityIndicator color={C.blue} style={{ marginVertical: 18 }} /> : null}
          {!slotsLoading && !days.length ? <Text style={[s.meta, { marginVertical: 16 }]}>No open times in the next two weeks. Send the mentor a message to ask for more availability.</Text> : null}

          {!slotsLoading && days.length ? (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 14 }}>
                {days.map(([k, list]) => (
                  <TouchableOpacity key={k} onPress={() => { setDay(k); setSlot(''); }} style={[s.day, day === k && s.dayOn]}>
                    <Text style={[s.dayText, day === k && { color: '#fff' }]}>{fmtDay(list[0])}</Text>
                    <Text style={[s.daySub, day === k && { color: '#DCE9FF' }]}>{list.length} slots</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={s.slotWrap}>
                {daySlots.map((iso) => (
                  <TouchableOpacity key={iso} onPress={() => setSlot(iso)} style={[s.slot, slot === iso && s.slotOn]}>
                    <Text style={[s.slotText, slot === iso && { color: '#fff' }]}>{fmtTime(iso)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : null}

          <TextInput value={note} onChangeText={setNote} placeholder="What would you like to learn? (optional)" placeholderTextColor="#8A97AE" multiline style={s.note} />
          <Btn title={busy ? 'Please wait...' : (price === 0 ? 'Book free lesson' : `Book and pay ${money(price, mentor.currency)}`)} onPress={book} disabled={busy || !slot} style={{ marginTop: 14 }} />
        </Card>

        <Card>
          <Text style={s.h}>Reviews ({mentor.reviewCount})</Text>
          {!reviews.length ? <Text style={s.meta}>No reviews yet. Book a trial lesson and be the first.</Text> : null}
          {reviews.map((r) => (
            <View key={r.id} style={s.review}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontWeight: '800', color: C.text }}>{r.studentName}</Text>
                <Stars value={r.rating} count={1} size={13} />
              </View>
              {r.comment ? <Text style={[s.body, { marginTop: 4 }]}>{r.comment}</Text> : null}
            </View>
          ))}
        </Card>
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  name: { fontSize: 20, fontWeight: '900', color: C.text, marginBottom: 4 },
  meta: { color: C.muted, fontSize: 12, marginTop: 3, lineHeight: 17 },
  h: { fontSize: 16, fontWeight: '800', color: C.text, marginBottom: 8 },
  body: { color: C.text, fontSize: 14, lineHeight: 21 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14 },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  type: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: '#fff' },
  typeOn: { backgroundColor: C.blue, borderColor: C.blue },
  typeLabel: { fontWeight: '800', color: C.text, fontSize: 13 },
  typePrice: { color: C.muted, fontSize: 12, marginTop: 2, fontWeight: '700' },
  day: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: '#fff', marginRight: 8, alignItems: 'center' },
  dayOn: { backgroundColor: C.blue, borderColor: C.blue },
  dayText: { fontWeight: '800', color: C.text, fontSize: 13 },
  daySub: { color: C.muted, fontSize: 11, marginTop: 2 },
  slotWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  slot: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: C.blue, backgroundColor: '#fff' },
  slotOn: { backgroundColor: C.blue },
  slotText: { color: C.blue, fontWeight: '800', fontSize: 13 },
  note: { marginTop: 14, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 10, minHeight: 60, textAlignVertical: 'top', color: '#102A56', backgroundColor: '#fff' },
  review: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.border },
});
