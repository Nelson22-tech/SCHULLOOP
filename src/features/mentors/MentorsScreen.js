// Find a mentor - browse, search and filter mentors (Preply-style marketplace).
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlueHeader, Btn, C, Card, ChipRow, CONNECT_BAR, ModuleBar, StatusPill } from '../../shared/ui/kit';
import apiService from '../../shared/services/apiService';
import { MentorAvatar, Stars, SUBJECTS, money } from './mentorUi';

const SORTS = { 'Top rated': 'rating', 'Lowest price': 'price_asc', 'Highest price': 'price_desc', Popular: '' };

export const MentorsScreen = ({ navigation }) => {
  const [query, setQuery] = useState('');
  const [subject, setSubject] = useState('All');
  const [sortLabel, setSortLabel] = useState('Popular');
  const [maxPrice, setMaxPrice] = useState('');
  const [mentors, setMentors] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const data = await apiService.getMentors({
        q: query.trim(), subject: subject === 'All' ? '' : subject, sort: SORTS[sortLabel], maxPrice: maxPrice.trim(),
      });
      setMentors(data.mentors || []); setTotal(data.total || 0);
    } catch (e) { setError(e.message || 'Could not load mentors'); setMentors([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, [query, subject, sortLabel, maxPrice]);

  useEffect(() => { load(); }, [subject, sortLabel]); // eslint-disable-line react-hooks/exhaustive-deps

  const goBack = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs'));

  return (
    <View style={s.root}>
      <BlueHeader title="Find a mentor" subtitle="Learn 1-on-1 from graduates and experts" onBack={goBack}>
        <View style={s.searchBox}>
          <Ionicons name="search" size={18} color={C.muted} />
          <TextInput value={query} onChangeText={setQuery} onSubmitEditing={() => load()} returnKeyType="search" placeholder="Search by name, subject or skill" placeholderTextColor="#8A97AE" style={s.searchInput} />
        </View>
      </BlueHeader>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />} contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={s.quickRow}>
          <TouchableOpacity style={s.quick} onPress={() => navigation.navigate('MyLessons')}>
            <Ionicons name="calendar" size={18} color={C.blue} /><Text style={s.quickText}>My lessons</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.quick} onPress={() => navigation.navigate('MentorSetup')}>
            <Ionicons name="school" size={18} color={C.blue} /><Text style={s.quickText}>Become a mentor</Text>
          </TouchableOpacity>
        </View>

        <ChipRow items={SUBJECTS} value={subject} onChange={setSubject} style={{ marginTop: 2 }} />
        <ChipRow items={Object.keys(SORTS)} value={sortLabel} onChange={setSortLabel} style={{ marginTop: -8 }} />
        <View style={s.priceRow}>
          <Text style={s.priceLabel}>Max price per hour</Text>
          <TextInput value={maxPrice} onChangeText={(v) => setMaxPrice(v.replace(/[^0-9.]/g, ''))} onSubmitEditing={() => load()} onEndEditing={() => load()} keyboardType="numeric" placeholder="Any" placeholderTextColor="#8A97AE" style={s.priceInput} />
        </View>

        {loading ? <ActivityIndicator color={C.blue} style={{ marginTop: 30 }} /> : null}
        {error ? <Card><Text style={{ color: C.red }}>{error}</Text></Card> : null}
        {!loading && !error ? <Text style={s.count}>{total} mentor{total === 1 ? '' : 's'} available</Text> : null}

        {!loading && mentors.map((m) => (
          <Card key={m.id} onPress={() => navigation.navigate('MentorDetail', { mentorId: m.id })} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row' }}>
              <MentorAvatar name={m.name} uri={m.avatarUrl} size={64} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Text style={s.name} numberOfLines={1}>{m.name}</Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={s.price}>{money(m.hourlyRate, m.currency)}</Text>
                    <Text style={s.perHour}>per hour</Text>
                  </View>
                </View>
                <Text style={s.headline} numberOfLines={2}>{m.headline}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
                  <Stars value={m.ratingAvg} count={m.reviewCount} />
                  <Text style={s.meta}>  ·  {m.lessonsCompleted} lessons</Text>
                  {m.experienceYears ? <Text style={s.meta}>  ·  {m.experienceYears} yrs</Text> : null}
                </View>
              </View>
            </View>
            <View style={s.pills}>{m.subjects.slice(0, 4).map((x) => <StatusPill key={x} label={x} tone="blue" />)}</View>
            <View style={s.footer}>
              <Text style={s.trial}>Trial lesson (30 min): <Text style={{ fontWeight: '800', color: C.text }}>{money(m.trialRate, m.currency)}</Text></Text>
              <Btn title="Book" onPress={() => navigation.navigate('MentorDetail', { mentorId: m.id })} style={{ paddingVertical: 8, paddingHorizontal: 22 }} />
            </View>
          </Card>
        ))}

        {!loading && !error && !mentors.length ? (
          <View style={s.empty}>
            <Ionicons name="school-outline" size={40} color={C.muted} />
            <Text style={s.emptyTitle}>No mentors found yet</Text>
            <Text style={s.meta}>Try another subject, or be the first to offer mentoring.</Text>
            <Btn title="Become a mentor" onPress={() => navigation.navigate('MentorSetup')} style={{ marginTop: 14, paddingHorizontal: 24 }} />
          </View>
        ) : null}
      </ScrollView>
      <ModuleBar items={CONNECT_BAR} active="connect" navigation={navigation} />
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, marginTop: 14 },
  searchInput: { flex: 1, paddingVertical: 11, paddingHorizontal: 8, fontSize: 14, color: '#102A56' },
  quickRow: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 14 },
  quick: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: C.border, paddingVertical: 11, marginRight: 8 },
  quickText: { marginLeft: 8, fontWeight: '800', color: C.blue, fontSize: 13 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 4 },
  priceLabel: { color: C.muted, fontWeight: '700', fontSize: 13 },
  priceInput: { width: 90, backgroundColor: '#fff', borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, textAlign: 'center', color: '#102A56' },
  count: { paddingHorizontal: 16, color: C.muted, fontWeight: '700', marginVertical: 8 },
  name: { flex: 1, fontSize: 16, fontWeight: '800', color: C.text, marginRight: 8 },
  price: { fontSize: 17, fontWeight: '900', color: C.text },
  perHour: { fontSize: 11, color: C.muted },
  headline: { color: C.muted, fontSize: 13, marginTop: 3, lineHeight: 18 },
  meta: { color: C.muted, fontSize: 12 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, gap: 6 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  trial: { color: C.muted, fontSize: 12, flex: 1, marginRight: 8 },
  empty: { alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: C.text, marginTop: 10, marginBottom: 4 },
});
