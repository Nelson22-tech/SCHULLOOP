import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BlueHeader, C, Card, ChipRow, IconTile, SearchField, SectionTitle, StatusPill, k, shadow } from '../../shared/ui/kit';
import { loadOpportunities, mixLatest } from './opportunities';

const TILES = [
  { title: 'Global School Finder', sub: 'Universities & colleges', icon: 'school', color: C.green, bg: C.greenSoft, route: 'SearchFilter' },
  { title: 'Jobs & Careers', sub: 'Full-time, internships', icon: 'briefcase', color: C.purple, bg: C.purpleSoft, route: 'JobPortal' },
  { title: 'Freelance Projects', sub: 'Gigs and proposals', icon: 'laptop', color: C.blue, bg: C.blueSoft, route: 'Freelance' },
  { title: 'Local Services', sub: 'Skilled people nearby', icon: 'construct', color: C.amber, bg: C.amberSoft, route: 'LocalServices' },
  { title: 'Scholarships & Training', sub: 'Funding and courses', icon: 'ribbon', color: C.orange, bg: C.amberSoft, route: 'Scholarships' },
];
const FILTERS = ['All', 'Jobs', 'Projects', 'Services', 'Scholarships'];
const GROUPS = [
  { filter: 'Jobs', key: 'jobs', title: 'Jobs' },
  { filter: 'Projects', key: 'projects', title: 'Freelance Projects' },
  { filter: 'Services', key: 'services', title: 'Local Services' },
  { filter: 'Scholarships', key: 'scholarships', title: 'Scholarships & Training' },
];

export const OpportunityRow = ({ item, navigation, last }) => (
  <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate(item.route, item.params)} style={[s.row, !last && s.rowBorder]}>
    <IconTile name={item.icon} box={40} size={20} />
    <View style={{ flex: 1, marginHorizontal: 10 }}>
      <Text style={s.rowTitle} numberOfLines={1}>{item.title}</Text>
      <Text style={s.rowSub} numberOfLines={1}>{item.subtitle}{item.sample ? ' · Sample listing' : ''}</Text>
    </View>
    <StatusPill label={item.badge} tone={item.tone} />
  </TouchableOpacity>
);

export const ExploreScreen = ({ navigation }) => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const [latest, setLatest] = useState([]);
  const [results, setResults] = useState(null); // null = not searching
  const [searchedFor, setSearchedFor] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    try { setLatest(mixLatest(await loadOpportunities(), 8)); } catch (e) { setLatest([]); }
    setLoading(false); setRefreshing(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const search = async () => {
    const q = query.trim();
    if (!q) { setResults(null); return; }
    // Schools are searched on their own screen.
    setSearching(true); setSearchedFor(q);
    try { setResults(await loadOpportunities(q)); } catch (e) { setResults({ jobs: [], projects: [], services: [], scholarships: [] }); }
    setSearching(false);
  };
  const clear = () => { setQuery(''); setResults(null); };

  const groups = GROUPS.filter(g => filter === 'All' || filter === g.filter);
  const total = results ? groups.reduce((n, g) => n + results[g.key].length, 0) : 0;

  return (
    <View style={k.screen}>
      <BlueHeader title="Jobs & Opportunities" subtitle="Schools, careers, projects, services and funding in one place">
        <SearchField value={query} onChangeText={t => { setQuery(t); if (!t) setResults(null); }} onSubmitEditing={search} placeholder="Search jobs, projects, services, scholarships..." />
      </BlueHeader>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />} contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        <ChipRow items={FILTERS} value={filter} onChange={setFilter} />

        {results ? (
          <>
            <SectionTitle title={`Results for "${searchedFor}"`} action="Clear" onAction={clear} />
            {searching ? <ActivityIndicator color={C.blue} style={{ marginTop: 20 }} /> : null}
            {!searching && total === 0 ? (
              <Card><Text style={s.empty}>Nothing found. Try another keyword or filter. To look for schools, use the Global School Finder below.</Text></Card>
            ) : null}
            {!searching ? groups.map(g => results[g.key].length ? (
              <View key={g.key}>
                <Text style={s.groupTitle}>{g.title} ({results[g.key].length})</Text>
                <Card style={s.listCard}>
                  {results[g.key].slice(0, 5).map((it, i, arr) => <OpportunityRow key={it.key} item={it} navigation={navigation} last={i === arr.length - 1} />)}
                </Card>
              </View>
            ) : null) : null}
          </>
        ) : null}

        <SectionTitle title="Explore categories" style={{ marginTop: 4 }} />
        <View style={s.grid}>
          {TILES.map(t => (
            <TouchableOpacity key={t.title} activeOpacity={0.85} style={s.tile} onPress={() => navigation.navigate(t.route)}>
              <IconTile name={t.icon} color={t.color} bg={t.bg} box={38} size={20} round={10} />
              <Text style={s.tileTitle}>{t.title}</Text>
              <Text style={s.tileSub}>{t.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <SectionTitle title="Featured Opportunities" />
        {loading ? <ActivityIndicator color={C.blue} style={{ marginTop: 16 }} /> : latest.length === 0 ? (
          <Card><Text style={s.empty}>No opportunities to show yet. Pull down to refresh.</Text></Card>
        ) : (
          <Card style={s.listCard}>
            {latest.map((it, i) => <OpportunityRow key={it.key} item={it} navigation={navigation} last={i === latest.length - 1} />)}
          </Card>
        )}
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12 },
  tile: { width: '47%', margin: '1.5%', backgroundColor: '#fff', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: C.border, minHeight: 104, ...shadow },
  tileTitle: { fontSize: 13, fontWeight: '800', color: C.text, marginTop: 10 },
  tileSub: { fontSize: 11, color: C.muted, marginTop: 3 },
  listCard: { paddingVertical: 2, paddingHorizontal: 12 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#EDF2FA' },
  rowTitle: { fontSize: 14, fontWeight: '700', color: C.text },
  rowSub: { fontSize: 12, color: C.muted, marginTop: 2 },
  groupTitle: { fontSize: 13, fontWeight: '800', color: C.muted, marginHorizontal: 16, marginBottom: 8 },
  empty: { color: C.muted, fontSize: 13, lineHeight: 19 },
});
