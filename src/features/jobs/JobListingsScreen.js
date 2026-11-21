import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BlueHeader, C, JOB_BAR, ModuleBar, SearchField } from '../../shared/ui/kit';
import { JobCard, applyJobFilters, fetchJobs, getJobId, getSavedIds, toggleSavedId } from './jobHelpers';

export const JobListingsScreen = ({ navigation, route }) => {
  const initial = route?.params?.filters || {};
  const [jobs, setJobs] = useState([]);
  const [saved, setSaved] = useState([]);
  const [query, setQuery] = useState(initial.query || '');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    try {
      const [list, ids] = await Promise.all([fetchJobs(), getSavedIds()]);
      setJobs(list); setSaved(ids);
    } catch (e) { setJobs([]); }
    setLoading(false); setRefreshing(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { const unsub = navigation.addListener('focus', () => getSavedIds().then(setSaved)); return unsub; }, [navigation]);

  const results = useMemo(() => applyJobFilters(jobs, { ...initial, query }), [jobs, initial, query]);
  const toggle = async id => setSaved(await toggleSavedId(id, saved));

  return (
    <View style={s.root}>
      <BlueHeader title="Job Portal" onBack={() => navigation.goBack()}>
        <SearchField value={query} onChangeText={setQuery} placeholder="Search jobs..." onFilter={() => navigation.navigate('JobSearch', { filters: { ...initial, query } })} />
      </BlueHeader>
      <View style={s.sheet}>
        <Text style={s.count}>Showing {results.length} result{results.length === 1 ? '' : 's'}</Text>
        {loading ? <ActivityIndicator color={C.blue} style={{ marginTop: 30 }} /> : (
          <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />} contentContainerStyle={{ paddingBottom: 20 }}>
            {results.map(job => (
              <JobCard
                key={getJobId(job)}
                job={job}
                saved={saved.includes(getJobId(job))}
                onToggleSave={() => toggle(getJobId(job))}
                onPress={() => navigation.navigate('JobDetails', { job })}
                onApply={() => navigation.navigate('ApplyJob', { job })}
              />
            ))}
            {!results.length ? (
              <View style={s.empty}>
                <Ionicons name="briefcase-outline" size={40} color={C.blueLine} />
                <Text style={s.emptyText}>No jobs match your search.</Text>
              </View>
            ) : null}
          </ScrollView>
        )}
      </View>
      <ModuleBar items={JOB_BAR} active="jobs" navigation={navigation} />
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  sheet: { flex: 1, backgroundColor: C.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, marginTop: -12 },
  count: { fontSize: 12, color: C.muted, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyText: { color: C.muted, marginTop: 8 },
});
