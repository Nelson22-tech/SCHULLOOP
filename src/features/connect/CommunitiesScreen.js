// Student Connect 2 - Communities list. Real groups come from the schools' groups API;
// SAMPLE_COMMUNITIES is only shown when nothing real is available (discovery content).
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, CONNECT_BAR, ChipRow, ModuleBar, WhiteHeader, SearchField, shadow } from '../../shared/ui/kit';
import apiService from '../../shared/services/apiService';

export const SAMPLE_COMMUNITIES = [
  { id: 'sample-1', name: 'Global Students', memberCount: 12400, type: 'class', sample: true },
  { id: 'sample-2', name: 'Computer Science', memberCount: 8700, type: 'study', sample: true },
  { id: 'sample-3', name: 'Business & Economics', memberCount: 6300, type: 'study', sample: true },
  { id: 'sample-4', name: 'Medicine & Health', memberCount: 5800, type: 'study', sample: true },
  { id: 'sample-5', name: 'Engineering', memberCount: 7200, type: 'study', sample: true },
  { id: 'sample-6', name: 'Arts & Design', memberCount: 4100, type: 'club', sample: true },
  { id: 'sample-7', name: 'Study Abroad', memberCount: 9600, type: 'alumni', sample: true },
  { id: 'sample-8', name: 'Technology & AI', memberCount: 6900, type: 'club', sample: true },
];

const TYPE_STYLE = {
  class: { icon: 'people', color: '#16A34A' },
  study: { icon: 'book', color: '#0838A0' },
  club: { icon: 'heart', color: '#E11D74' },
  announcements: { icon: 'megaphone', color: '#F59E0B' },
  alumni: { icon: 'globe', color: '#0B5FE8' },
};
const COLORS = ['#16A34A', '#0838A0', '#0B5FE8', '#16A34A', '#4F46E5', '#E11D74', '#0EA5E9', '#0B5FE8'];

export const communityStyle = (group, index = 0) => {
  const base = TYPE_STYLE[group?.type] || TYPE_STYLE.class;
  return { icon: base.icon, color: group?.sample ? COLORS[index % COLORS.length] : base.color };
};

export const formatMembers = (count = 0) => {
  const n = Number(count) || 0;
  const value = n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(n);
  return `${value} member${n === 1 ? '' : 's'}`;
};

// Collects the groups of the first verified schools (there is no global groups endpoint).
export const loadCommunities = async (maxSchools = 8) => {
  const schoolsRes = await apiService.getSchools({});
  const schools = (schoolsRes.schools || []).slice(0, maxSchools);
  const results = await Promise.allSettled(schools.map(s => apiService.getSchoolGroups(s.id || s._id)));
  const groups = [];
  results.forEach((res, i) => {
    if (res.status !== 'fulfilled') return;
    (res.value.groups || []).forEach(g => groups.push({ ...g, schoolName: schools[i].name }));
  });
  return groups;
};

const FILTERS = ['All', 'Study Groups', 'Countries', 'Interests'];
const matchesFilter = (g, filter) => {
  if (filter === 'All') return true;
  if (filter === 'Study Groups') return g.type === 'study';
  if (filter === 'Countries') return g.type === 'class' || g.type === 'alumni';
  return g.type === 'club' || g.type === 'announcements';
};

export const CommunitiesScreen = ({ navigation }) => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true); else setLoading(true);
    try {
      setGroups(await loadCommunities());
    } catch (error) {
      setGroups([]);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const usingSample = !loading && groups.length === 0;
  const source = usingSample ? SAMPLE_COMMUNITIES : groups;
  const rows = useMemo(() => source.filter(g => matchesFilter(g, filter)
    && (!query.trim() || g.name.toLowerCase().includes(query.trim().toLowerCase()))), [source, filter, query]);

  const join = async (group) => {
    if (group.sample) { Alert.alert('Communities', 'Sample community. Real communities appear once schools create groups.'); return; }
    setBusyId(group.id);
    try {
      if (group.isMember) await apiService.leaveGroup(group.id); else await apiService.joinGroup(group.id);
      await load(true);
    } catch (error) { Alert.alert('Communities', error.message); } finally { setBusyId(null); }
  };

  return (
    <View style={s.root}>
      <WhiteHeader
        title="Communities"
        onBack={() => navigation.goBack()}
        right={<TouchableOpacity hitSlop={10} onPress={() => { setSearching(v => !v); setQuery(''); }}><Ionicons name={searching ? 'close' : 'search'} size={22} color={C.text} /></TouchableOpacity>}
      />
      {searching ? <View style={{ paddingHorizontal: 16, backgroundColor: '#fff' }}><SearchField value={query} onChangeText={setQuery} placeholder="Search communities" style={s.searchBox} /></View> : null}
      <View style={{ backgroundColor: '#fff' }}><ChipRow items={FILTERS} value={filter} onChange={setFilter} /></View>
      {loading ? <ActivityIndicator color={C.blue} style={{ marginTop: 40 }} /> : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 24 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}>
          {usingSample ? <Text style={s.note}>Sample communities - real ones appear when schools create groups.</Text> : null}
          {rows.map((g, i) => {
            const st = communityStyle(g, i);
            return (
              <TouchableOpacity key={g.id} activeOpacity={0.85} style={s.row} onPress={() => navigation.navigate('CommunityDetail', { group: g })}>
                <View style={[s.circle, { backgroundColor: st.color }]}><Ionicons name={st.icon} size={22} color="#fff" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.name} numberOfLines={1}>{g.name}</Text>
                  <Text style={s.sub}>{formatMembers(g.memberCount)}</Text>
                </View>
                {g.isAdmin ? <Text style={s.manage}>Manager</Text> : (
                  <TouchableOpacity disabled={busyId === g.id} onPress={() => join(g)} style={[s.join, g.isMember && s.joined]}>
                    <Text style={[s.joinText, g.isMember && { color: C.blue }]}>{g.isMember ? 'Joined' : 'Join'}</Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          })}
          {!rows.length ? <Text style={s.empty}>No communities found.</Text> : null}
        </ScrollView>
      )}
      <ModuleBar items={CONNECT_BAR} active="connect" navigation={navigation} />
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  searchBox: { backgroundColor: C.bg, marginTop: 10, marginBottom: 2 },
  note: { color: C.muted, fontSize: 12, marginBottom: 10, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: C.border, ...shadow },
  circle: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  name: { fontSize: 15, fontWeight: '800', color: C.text },
  sub: { fontSize: 12, color: C.muted, marginTop: 2 },
  join: { backgroundColor: C.blue, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: C.blue },
  joined: { backgroundColor: '#fff' },
  joinText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  manage: { color: C.green, fontWeight: '800', fontSize: 12 },
  empty: { textAlign: 'center', color: C.muted, marginTop: 30 },
});
