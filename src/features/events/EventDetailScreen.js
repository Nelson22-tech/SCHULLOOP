import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { BlueHeader, Btn, C, Card, StatusPill } from '../../shared/ui/kit';
import apiService from '../../shared/services/apiService';
import { fmtEventDate } from './eventUi';

export const EventDetailScreen = ({ navigation, route }) => {
  const eventId = route?.params?.eventId;
  const [e, setE] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try { setE((await apiService.getEvent(eventId)).event); setError(''); }
    catch (err) { setError(err.message || 'Could not load this event'); }
    finally { setLoading(false); }
  }, [eventId]);
  useEffect(() => { load(); }, [load]);

  const goBack = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Events'));
  const act = async (fn) => { setBusy(true); try { await fn(); await load(); } catch (err) { Alert.alert('Could not update', err.message || 'Please try again.'); } finally { setBusy(false); } };
  const cancelEvent = () => Alert.alert('Cancel this event?', 'Everyone who joined will be notified.', [
    { text: 'Keep it', style: 'cancel' },
    { text: 'Cancel event', style: 'destructive', onPress: () => act(async () => { await apiService.cancelEvent(eventId); }) },
  ]);
  const openLink = (url) => WebBrowser.openBrowserAsync(url).catch(() => Linking.openURL(url));

  if (loading) return <View style={s.root}><BlueHeader title="Event" onBack={goBack} /><ActivityIndicator color={C.blue} style={{ marginTop: 40 }} /></View>;
  if (error || !e) return <View style={s.root}><BlueHeader title="Event" onBack={goBack} /><Card><Text style={{ color: C.red }}>{error || 'Event not found'}</Text></Card></View>;

  const past = new Date(e.startAt).getTime() < Date.now() - 2 * 3600 * 1000;
  return (
    <View style={s.root}>
      <BlueHeader title="Event" subtitle={e.category} onBack={goBack} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Card style={{ marginTop: 14 }}>
          <Text style={s.title}>{e.title}</Text>
          <View style={{ flexDirection: 'row', gap: 6, marginVertical: 8 }}>
            <StatusPill label={e.mode === 'online' ? 'Online' : 'In person'} tone="blue" />
            {e.status === 'cancelled' ? <StatusPill label="Cancelled" tone="red" /> : null}
            {past ? <StatusPill label="Ended" tone="gray" /> : null}
          </View>
          <Text style={s.row}>When: {fmtEventDate(e.startAt)}{e.endAt ? ` – ${new Date(e.endAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}` : ''}</Text>
          {e.location ? <Text style={s.row}>Where: {e.location}</Text> : null}
          <Text style={s.row}>Host: {e.hostName}</Text>
          <Text style={s.row}>{e.attendeeCount}{e.capacity ? ` of ${e.capacity}` : ''} going</Text>
        </Card>
        {e.description ? <Card><Text style={s.h}>About</Text><Text style={s.body}>{e.description}</Text></Card> : null}

        {e.status === 'active' && !past ? (
          <View style={{ marginHorizontal: 16 }}>
            {e.isHost ? (
              <>
                {e.link ? <Btn title="Open event link" onPress={() => openLink(e.link)} style={{ marginBottom: 10 }} /> : null}
                <Btn title="Edit event" variant="outline" onPress={() => navigation.navigate('EventForm', { event: e })} style={{ marginBottom: 10 }} />
                <Btn title="Cancel event" variant="outline" onPress={cancelEvent} />
              </>
            ) : e.going ? (
              <>
                {e.link ? <Btn title="Join event" onPress={() => openLink(e.link)} style={{ marginBottom: 10 }} /> : e.hasLink ? null : null}
                <Btn title="Can't go anymore" variant="outline" disabled={busy} onPress={() => act(() => apiService.cancelRsvp(eventId))} />
              </>
            ) : (
              <>
                <Btn title={e.full ? 'Event is full' : "I'm going"} disabled={busy || e.full} onPress={() => act(() => apiService.rsvpEvent(eventId))} />
                {e.hasLink ? <Text style={s.hint}>The join link is shown after you RSVP.</Text> : null}
              </>
            )}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  title: { fontSize: 20, fontWeight: '900', color: C.text },
  row: { color: C.text, fontSize: 14, marginTop: 6 },
  h: { fontSize: 16, fontWeight: '800', color: C.text, marginBottom: 6 },
  body: { color: C.text, fontSize: 14, lineHeight: 21 },
  hint: { color: C.muted, fontSize: 12, marginTop: 8, textAlign: 'center' },
});
