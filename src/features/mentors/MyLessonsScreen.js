// My lessons: student bookings and (for mentors) incoming lessons, with join/cancel/complete/review.
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { BlueHeader, Btn, C, Card, CONNECT_BAR, ModuleBar, StatusPill } from '../../shared/ui/kit';
import apiService from '../../shared/services/apiService';
import { fmtDateTime, money } from './mentorUi';

const TONE = { pending_payment: 'amber', confirmed: 'green', completed: 'blue', cancelled: 'red' };
const LABEL = { pending_payment: 'Awaiting payment', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled' };

export const MyLessonsScreen = ({ navigation }) => {
  const [role, setRole] = useState('student');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reviewFor, setReviewFor] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true); else setLoading(true);
    try { const d = await apiService.getMyBookings(role); setRows(d.bookings || []); }
    catch (e) { Alert.alert('Could not load lessons', e.message || 'Please try again.'); setRows([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, [role]);
  useEffect(() => { load(); }, [load]);

  const run = async (fn, okMsg) => {
    try { const r = await fn(); if (okMsg || r?.message) Alert.alert('Done', r?.message || okMsg); await load(true); }
    catch (e) { Alert.alert('Something went wrong', e.message || 'Please try again.'); }
  };
  const cancel = (b) => Alert.alert('Cancel lesson?', 'Students get a refund when cancelling 24+ hours ahead. Mentor cancellations are always refunded.', [
    { text: 'Keep it', style: 'cancel' }, { text: 'Cancel lesson', style: 'destructive', onPress: () => run(() => apiService.cancelMentorBooking(b.id)) },
  ]);
  const submitReview = () => run(async () => { await apiService.reviewMentorBooking(reviewFor, rating, comment.trim()); setReviewFor(null); setComment(''); setRating(5); }, 'Thanks for your review!');
  const join = (url) => (url ? WebBrowser.openBrowserAsync(url).catch(() => Linking.openURL(url)) : null);

  const goBack = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Mentors'));
  const now = Date.now();

  return (
    <View style={s.root}>
      <BlueHeader title="My lessons" subtitle="Your upcoming and past lessons" onBack={goBack} />
      <View style={s.tabs}>
        {[['student', 'As student'], ['mentor', 'As mentor']].map(([k, l]) => (
          <TouchableOpacity key={k} onPress={() => setRole(k)} style={[s.tab, role === k && s.tabOn]}><Text style={[s.tabText, role === k && { color: '#fff' }]}>{l}</Text></TouchableOpacity>
        ))}
      </View>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />} contentContainerStyle={{ paddingBottom: 24 }}>
        {role === 'mentor' ? <Btn title="Edit mentor profile & availability" variant="outline" onPress={() => navigation.navigate('MentorSetup')} style={{ marginHorizontal: 16, marginTop: 4 }} /> : null}
        {loading ? <ActivityIndicator color={C.blue} style={{ marginTop: 30 }} /> : null}
        {!loading && !rows.length ? (
          <View style={{ alignItems: 'center', padding: 36 }}>
            <Ionicons name="calendar-outline" size={40} color={C.muted} />
            <Text style={s.empty}>{role === 'student' ? 'No lessons yet' : 'No lessons booked with you yet'}</Text>
            {role === 'student' ? <Btn title="Find a mentor" onPress={() => navigation.navigate('Mentors')} style={{ marginTop: 12, paddingHorizontal: 24 }} /> : null}
          </View>
        ) : null}
        {rows.map((b) => {
          const started = new Date(b.startAt).getTime() <= now;
          const who = role === 'student' ? b.mentorName : b.studentName;
          return (
            <Card key={b.id} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={s.who}>{who}</Text>
                  <Text style={s.meta}>{fmtDateTime(b.startAt)} · {b.durationMin} min{b.isTrial ? ' · Trial' : ''}</Text>
                  <Text style={s.meta}>{role === 'mentor' && b.mentorNet !== undefined ? `You earn ${money(b.mentorNet, b.currency)}` : money(b.price, b.currency)}</Text>
                </View>
                <StatusPill label={LABEL[b.status] || b.status} tone={TONE[b.status] || 'blue'} />
              </View>
              {b.note ? <Text style={[s.meta, { marginTop: 6 }]}>“{b.note}”</Text> : null}
              {b.refundDue ? <Text style={[s.meta, { color: C.red }]}>Refund queued with support.</Text> : null}
              <View style={s.actions}>
                {b.status === 'confirmed' && b.meetingUrl ? <Btn title="Join lesson" onPress={() => join(b.meetingUrl)} style={s.btn} /> : null}
                {b.status === 'pending_payment' && role === 'student' ? <Btn title="Pay now" onPress={() => navigation.navigate('MentorDetail', { mentorId: b.mentorProfileId })} style={s.btn} /> : null}
                {['pending_payment', 'confirmed'].includes(b.status) ? <Btn title="Cancel" variant="outline" onPress={() => cancel(b)} style={s.btn} /> : null}
                {role === 'mentor' && b.status === 'confirmed' && started ? <Btn title="Mark complete" onPress={() => run(() => apiService.completeMentorBooking(b.id), 'Lesson marked complete.')} style={s.btn} /> : null}
                {role === 'student' && b.status === 'completed' && !b.reviewed ? <Btn title="Leave review" onPress={() => setReviewFor(b.id)} style={s.btn} /> : null}
                {role === 'student' ? <Btn title="View mentor" variant="outline" onPress={() => navigation.navigate('MentorDetail', { mentorId: b.mentorProfileId })} style={s.btn} /> : null}
              </View>
              {reviewFor === b.id ? (
                <View style={{ marginTop: 12 }}>
                  <View style={{ flexDirection: 'row' }}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <TouchableOpacity key={n} onPress={() => setRating(n)}><Ionicons name={n <= rating ? 'star' : 'star-outline'} size={30} color="#F5A623" /></TouchableOpacity>
                    ))}
                  </View>
                  <TextInput value={comment} onChangeText={setComment} placeholder="How was your lesson?" placeholderTextColor="#8A97AE" multiline style={s.input} />
                  <View style={{ flexDirection: 'row', marginTop: 10 }}>
                    <Btn title="Submit review" onPress={submitReview} style={s.btn} />
                    <Btn title="Close" variant="outline" onPress={() => setReviewFor(null)} style={s.btn} />
                  </View>
                </View>
              ) : null}
            </Card>
          );
        })}
      </ScrollView>
      <ModuleBar items={CONNECT_BAR} active="connect" navigation={navigation} />
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  tabs: { flexDirection: 'row', margin: 16, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 4 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 9 },
  tabOn: { backgroundColor: C.blue },
  tabText: { fontWeight: '800', color: C.muted },
  who: { fontSize: 16, fontWeight: '800', color: C.text },
  meta: { color: C.muted, fontSize: 12, marginTop: 3 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  btn: { paddingVertical: 8, paddingHorizontal: 16 },
  empty: { fontSize: 16, fontWeight: '800', color: C.text, marginTop: 10 },
  input: { marginTop: 10, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 10, minHeight: 60, textAlignVertical: 'top', color: '#102A56', backgroundColor: '#fff' },
});
