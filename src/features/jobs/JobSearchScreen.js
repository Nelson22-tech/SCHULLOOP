import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BlueHeader, Btn, C, Chip, JOB_BAR, ModuleBar, SearchField, shadow } from '../../shared/ui/kit';
import { EXPERIENCE_LEVELS, JOB_TYPES, SALARY_RANGES, fetchJobs } from './jobHelpers';

const TYPE_CHIPS = ['All', 'Full-time', 'Part-time', 'Internship'];
const EMPTY = { query: '', type: 'All', location: '', experience: '', salary: '', company: '' };

export const JobSearchScreen = ({ navigation, route }) => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [f, setF] = useState({ ...EMPTY, ...(route?.params?.filters || {}) });
  const [open, setOpen] = useState('');

  useEffect(() => {
    fetchJobs().then(setJobs).catch(() => setJobs([])).finally(() => setLoading(false));
  }, []);

  const set = (key, value) => setF(prev => ({ ...prev, [key]: value }));
  const unique = list => Array.from(new Set(list.filter(Boolean)));
  const rows = [
    { key: 'location', label: 'Location', any: 'All Locations', options: unique(jobs.map(j => j.location)) },
    { key: 'type', label: 'Job Type', any: 'All Types', options: JOB_TYPES },
    { key: 'experience', label: 'Experience Level', any: 'All Levels', options: EXPERIENCE_LEVELS },
    { key: 'salary', label: 'Salary Range', any: 'Any Salary', options: SALARY_RANGES },
    { key: 'company', label: 'Company', any: 'All Companies', options: unique(jobs.map(j => j.company)) },
  ];
  const valueOf = key => (key === 'type' ? (f.type === 'All' ? '' : f.type) : f[key]);
  const apply = () => navigation.navigate('JobListings', { filters: f });
  const clear = () => { setF(EMPTY); setOpen(''); };

  return (
    <View style={s.root}>
      <BlueHeader title="Job Portal" onBack={() => navigation.goBack()}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <SearchField style={{ flex: 1 }} value={f.query} onChangeText={v => set('query', v)} placeholder="Search jobs, companies, or keywords..." onSubmitEditing={apply} />
          <TouchableOpacity style={s.filterBtn} onPress={apply}><Ionicons name="options" size={22} color="#fff" /></TouchableOpacity>
        </View>
      </BlueHeader>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={s.chips}>
          {TYPE_CHIPS.map(t => <Chip key={t} label={t} active={f.type === t} onPress={() => set('type', t)} />)}
        </View>
        <View style={s.filterHead}>
          <Text style={s.filterTitle}>Filter</Text>
          <Ionicons name="chevron-down" size={18} color={C.muted} />
        </View>
        {loading ? <ActivityIndicator color={C.blue} style={{ marginVertical: 20 }} /> : rows.map(r => {
          const val = valueOf(r.key);
          const isOpen = open === r.key;
          return (
            <View key={r.key} style={s.row}>
              <TouchableOpacity style={s.rowTop} onPress={() => setOpen(isOpen ? '' : r.key)} activeOpacity={0.8}>
                <View style={{ flex: 1 }}>
                  <Text style={s.rowTitle}>{r.label}</Text>
                  <Text style={[s.rowSub, val ? { color: C.blue, fontWeight: '700' } : null]}>{val || r.any}</Text>
                </View>
                <Ionicons name={isOpen ? 'chevron-down' : 'chevron-forward'} size={18} color={C.muted} />
              </TouchableOpacity>
              {isOpen ? (
                <View style={s.options}>
                  <Chip label={r.any} active={!val} onPress={() => { set(r.key, r.key === 'type' ? 'All' : ''); setOpen(''); }} style={s.optChip} />
                  {r.options.map(o => <Chip key={o} label={o} active={val === o} onPress={() => { set(r.key, o); setOpen(''); }} style={s.optChip} />)}
                </View>
              ) : null}
            </View>
          );
        })}
        <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
          <Btn title="Apply Filters" onPress={apply} />
          <TouchableOpacity onPress={clear} style={{ alignItems: 'center', paddingVertical: 14 }}>
            <Text style={{ color: C.blue, fontWeight: '700' }}>Clear All</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <ModuleBar items={JOB_BAR} active="jobs" navigation={navigation} />
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  filterBtn: { width: 46, height: 46, borderRadius: 12, backgroundColor: C.blueDark, alignItems: 'center', justifyContent: 'center', marginLeft: 8, marginTop: 14 },
  chips: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6, flexWrap: 'wrap' },
  filterHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginTop: 8, marginBottom: 10 },
  filterTitle: { fontSize: 16, fontWeight: '800', color: C.text },
  row: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: C.border, marginHorizontal: 16, marginBottom: 10, ...shadow },
  rowTop: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  rowTitle: { fontSize: 14, fontWeight: '700', color: C.text },
  rowSub: { fontSize: 12, color: C.muted, marginTop: 3 },
  options: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingBottom: 10 },
  optChip: { marginBottom: 8 },
});
