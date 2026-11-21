import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BlueHeader, C, JOB_BAR, ModuleBar } from '../../shared/ui/kit';
import { JobCard, fetchJobs, getJobId, getSavedIds, toggleSavedId } from './jobHelpers';

export const SavedJobsScreen = ({ navigation }) => {
  const [jobs, setJobs] = useState([]);
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [list, ids] = await Promise.all([fetchJobs(), getSavedIds()]);
      setJobs(list); setSaved(ids);
    } catch (e) { setJobs([]); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { const unsub = navigation.addListener('focus', load); return unsub; }, [navigation, load]);

  const savedJobs = jobs.filter(j => saved.includes(getJobId(j)));
  const remove = async id => setSaved(await toggleSavedId(id, saved));

  return (
    <View style={s.root}>
      <BlueHeader title="Saved Jobs" onBack={() => navigation.goBack()} />
      <View style={s.sheet}>
        {loading ? <ActivityIndicator color={C.blue} style={{ marginTop: 30 }} /> : (
          <ScrollView contentContainerStyle={{ paddingTop: 16, paddingBottom: 20 }}>
            {savedJobs.map(job => (
              <JobCard
                key={getJobId(job)}
                job={job}
                saved
                showApply={false}
                onToggleSave={() => remove(getJobId(job))}
                onPress={() => navigation.navigate('JobDetails', { job })}
              />
            ))}
            {!savedJobs.length ? (
              <View style={s.empty}>
                <Ionicons name="bookmark-outline" size={40} color={C.blueLine} />
                <Text style={s.emptyText}>No saved jobs yet. Tap the bookmark on a job to save it.</Text>
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
  empty: { alignItems: 'center', marginTop: 40, paddingHorizontal: 30 },
  emptyText: { color: C.muted, marginTop: 8, textAlign: 'center' },
});
