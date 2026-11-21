// Events: browse upcoming events, see the ones you're going to or hosting.
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlueHeader, Btn, C, Card, ChipRow, CONNECT_BAR, ModuleBar, StatusPill } from '../../shared/ui/kit';
import apiService from '../../shared/services/apiService';
import { EVENT_CATEGORIES, fmtEventDate } from './eventUi';

export const EventsScreen = ({ navigation }) => {
  const [tab, setTab] = useState('upcoming');
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const d = tab === 'upcoming' ? await apiService.getEvents({ category, q: query.trim() }) : await apiService.getMyEvents(tab);
      setEvents(d.events || []);
    } catch (e) { setError(e.message || 'Could not load events'); setEvents([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, [tab, category, query]);

  useEffect(() => { load(); }, [tab, category]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => navigation.addListener('focus', () => load(true)), [navigation, load]);

  const goBack = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs'));

  return (
    <View style={s.root}>
      <BlueHeader title="Events" subtitle="Workshops, meetups and webinars" onBack={goBack}>
        {tab === 'upcoming' ? (
          <View style={s.searchBox}>
            <Ionicons name="search" size={18} color={C.muted} />
            <TextInput value={query} onChangeText={setQuery} onSubmitEditing={() => load()} returnKeyType="search" placeholder="Search events" placeholderTextColor="#8A97AE" style={s.searchInput} />
          </View>
        ) : null}
      </BlueHeader>
      <View style={s.tabs}>
        {[['upcoming', 'Upcoming'], ['going', "I'm going"], ['hosting', 'Hosting']].map(([k, l]) => (
          <TouchableOpacity key={k} onPress={() => setTab(k)} style={[s.tab, tab === k && s.tabOn]}><Text style={[s.tabText, tab === k && { color: '#fff' }]}>{l}</Text></TouchableOpacity>
        ))}
      </View>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />} contentContainerStyle={{ paddingBottom: 90 }}>
        {tab === 'upcoming' ? <ChipRow items={EVENT_CATEGORIES} value={category} onChange={setCategory} style={{ marginTop: -6 }} /> : null}
        {loading ? <ActivityIndicator color={C.blue} style={{ marginTop: 30 }} /> : null}
        {error ? <Card><Text style={{ color: C.red }}>{error}</Text></Card> : null}
        {!loading && !error && !events.length ? (
          <View style={{ alignItems: 'center', padding: 36 }}>
            <Ionicons name="calendar-outline" size={40} color={C.muted} />
            <Text style={s.emptyTitle}>{tab === 'upcoming' ? 'No upcoming events' : tab === 'going' ? "You haven't joined any events" : "You aren't hosting any events"}</Text>
            <Btn title="Host an event" onPress={() => navigation.navigate('EventForm')} style={{ marginTop: 12, paddingHorizontal: 24 }} />
          </View>
        ) : null}
        {events.map((e) => (
          <Card key={e.id} onPress={() => navigation.navigate('EventDetail', { eventId: e.id })} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row' }}>
              <View style={s.date}>
                <Text style={s.dateMonth}>{new Date(e.startAt).toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}</Text>
                <Text style={s.dateDay}>{new Date(e.startAt).getDate()}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={s.title} numberOfLines={2}>{e.title}</Text>
                <Text style={s.meta}>{fmtEventDate(e.startAt)}</Text>
                <Text style={s.meta} numberOfLines={1}>{e.mode === 'online' ? 'Online' : e.location} · by {e.hostName}</Text>
              </View>
            </View>
            <View style={s.foot}>
              <StatusPill label={e.category} tone="blue" />
              {e.status === 'cancelled' ? <StatusPill label="Cancelled" tone="red" /> : e.going ? <StatusPill label="Going" tone="green" /> : e.full ? <StatusPill label="Full" tone="gray" /> : null}
              <Text style={[s.meta, { marginLeft: 'auto' }]}>{e.attendeeCount}{e.capacity ? `/${e.capacity}` : ''} going</Text>
            </View>
          </Card>
        ))}
      </ScrollView>
      <TouchableOpacity style={s.fab} onPress={() => navigation.navigate('EventForm')} activeOpacity={0.9}>
        <Ionicons name="add" size={22} color="#fff" /><Text style={s.fabText}>Host event</Text>
      </TouchableOpacity>
      <ModuleBar items={CONNECT_BAR} active="connect" navigation={navigation} />
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, marginTop: 14 },
  searchInput: { flex: 1, paddingVertical: 11, paddingHorizontal: 8, fontSize: 14, color: '#102A56' },
  tabs: { flexDirection: 'row', margin: 16, marginBottom: 6, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 4 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 9 },
  tabOn: { backgroundColor: C.blue },
  tabText: { fontWeight: '800', color: C.muted, fontSize: 13 },
  date: { width: 54, height: 58, borderRadius: 12, backgroundColor: C.blueSoft, alignItems: 'center', justifyContent: 'center' },
  dateMonth: { fontSize: 11, fontWeight: '800', color: C.blue },
  dateDay: { fontSize: 22, fontWeight: '900', color: C.blue },
  title: { fontSize: 16, fontWeight: '800', color: C.text },
  meta: { color: C.muted, fontSize: 12, marginTop: 3 },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: C.text, marginTop: 10, textAlign: 'center' },
  fab: { position: 'absolute', right: 16, bottom: 84, flexDirection: 'row', alignItems: 'center', backgroundColor: C.blue, borderRadius: 26, paddingVertical: 12, paddingHorizontal: 18, elevation: 4, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  fabText: { color: '#fff', fontWeight: '800', marginLeft: 6 },
});
