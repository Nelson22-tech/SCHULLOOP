import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import apiService from '../../shared/services/apiService';
import { BlueHeader, Btn, C, Card, ChipRow, SearchField, StatusPill } from '../../shared/ui/kit';
import { IMMIGRATION_WARNING, SAMPLE_ITEMS, formatDate } from './scholarshipHelpers';

const TABS = [['scholarship', 'Scholarships'], ['training', 'Training'], ['webinar', 'Webinars'], ['immigration', 'Immigration']];
const LEVELS = ['All', 'Undergraduate', 'Postgraduate', 'Others'];

export const ScholarshipsScreen = ({ navigation }) => {
  const [type, setType] = useState('scholarship');
  const [level, setLevel] = useState('All');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([]);
  const [usingSample, setUsingSample] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    try {
      const data = await apiService.request('/scholarships');
      const list = data.items || [];
      // Real listings, plus the labelled Immigration samples until an admin has published real ones.
      const immSamples = list.some(i => i.type === 'immigration') ? [] : SAMPLE_ITEMS.filter(i => i.type === 'immigration');
      if (list.length) { setItems([...list, ...immSamples]); setUsingSample(false); }
      else { setItems(SAMPLE_ITEMS); setUsingSample(true); } // SAMPLE fallback
    } catch (e) { setItems(SAMPLE_ITEMS); setUsingSample(true); }
    setLoading(false); setRefreshing(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(i => {
      if (i.type !== type) return false;
      if (level !== 'All') {
        const want = level === 'Others' ? 'Other' : level;
        if ((i.level || 'Other') !== want) return false;
      }
      if (!q) return true;
      return [i.title, i.provider, i.location].some(v => String(v || '').toLowerCase().includes(q));
    });
  }, [items, type, level, query]);

  const label = TABS.find(t => t[0] === type)[1].toLowerCase();

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <BlueHeader title="Scholarships & Training" onBack={() => navigation.goBack()} />
      <View style={s.tabs}>
        {TABS.map(([key, name]) => (
          <TouchableOpacity key={key} style={[s.tab, type === key && s.tabOn]} onPress={() => setType(key)}>
            <Text style={[s.tabText, type === key && { color: '#fff' }]}>{name}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={{ paddingHorizontal: 16 }}>
        <SearchField value={query} onChangeText={setQuery} placeholder={`Search ${label}...`} style={s.search} />
      </View>
      <ChipRow items={LEVELS} value={level} onChange={setLevel} />
      {type === 'immigration' ? <View style={s.warn}><Ionicons name="warning" size={16} color="#B45309" style={{ marginRight: 8, marginTop: 1 }} /><Text style={s.warnText}>{IMMIGRATION_WARNING}</Text></View> : null}
      {usingSample && !loading ? <Text style={s.note}>Sample listings shown - nothing published yet.</Text> : null}
      {loading ? <ActivityIndicator color={C.blue} style={{ marginTop: 30 }} /> : (
        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />} contentContainerStyle={{ paddingBottom: 30 }}>
          {!results.length ? (
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Ionicons name="school-outline" size={44} color={C.blueLine} />
              <Text style={{ color: C.muted, marginTop: 8 }}>No {label} match your filters.</Text>
            </View>
          ) : null}
          {results.map(item => (
            <Card key={item._id} onPress={() => navigation.navigate('ScholarshipDetail', { item })}>
              <View style={s.row}>
                <View style={s.logo}><Ionicons name={item.type === 'scholarship' ? 'ribbon' : item.type === 'webinar' ? 'videocam' : item.type === 'immigration' ? 'airplane' : 'laptop'} size={26} color={C.blue} /></View>
                <View style={{ flex: 1, marginHorizontal: 12 }}>
                  <Text style={s.title} numberOfLines={2}>{item.title}</Text>
                  <Text style={s.provider} numberOfLines={1}>{item.provider}</Text>
                  <Text style={s.deadline}>Deadline: {formatDate(item.deadline)}</Text>
                  <View style={s.row}>
                    {item.verified ? <View style={s.verified}><Ionicons name="checkmark-circle" size={14} color={C.green} /><Text style={s.verifiedText}>Verified</Text></View> : null}
                    {item.sample ? <StatusPill label="Sample" tone="gray" /> : null}
                  </View>
                  {item.source ? <Text style={s.source} numberOfLines={1}>Source: {item.source}</Text> : null}
                </View>
                <Btn title="View" style={s.view} onPress={() => navigation.navigate('ScholarshipDetail', { item })} />
              </View>
            </Card>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  tabs: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 14 },
  tab: { flex: 1, paddingVertical: 10, paddingHorizontal: 2, alignItems: 'center', borderRadius: 12, backgroundColor: C.blueSoft, marginRight: 6 },
  tabOn: { backgroundColor: C.blue },
  tabText: { color: C.blue, fontWeight: '800', fontSize: 11.5 },
  warn: { flexDirection: 'row', backgroundColor: '#FEF3C7', borderRadius: 12, padding: 12, marginHorizontal: 16, marginBottom: 8 },
  warnText: { flex: 1, color: '#92400E', fontSize: 12, lineHeight: 17 },
  search: { marginTop: 12, borderWidth: 1, borderColor: C.border },
  note: { color: C.muted, fontSize: 12, paddingHorizontal: 16, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center' },
  logo: { width: 54, height: 54, borderRadius: 12, backgroundColor: C.blueSoft, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 14, fontWeight: '800', color: C.text },
  provider: { fontSize: 12, color: C.muted, marginTop: 2 },
  deadline: { fontSize: 12, color: C.red, fontWeight: '600', marginTop: 3 },
  verified: { flexDirection: 'row', alignItems: 'center', marginRight: 8, marginTop: 3 },
  verifiedText: { color: C.green, fontSize: 11, fontWeight: '800', marginLeft: 3 },
  source: { fontSize: 11, color: C.muted, marginTop: 3 },
  view: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10 },
});
