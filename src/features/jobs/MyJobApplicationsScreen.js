import { Ionicons } from '@expo/vector-icons';
import { useCallback, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BlueHeader, C, Card, ChipRow, JOB_BAR, ModuleBar, StatusPill } from '../../shared/ui/kit';
import apiService from '../../shared/services/apiService';
import { AuthContext } from '../auth/AuthContext';
import { CompanyLogo, appBucket, appStatusLabel, appStatusTone, applicationJob, fetchJobs, formatDate } from './jobHelpers';

const FILTERS = ['All', 'Applied', 'Interview', 'Hired'];

export const MyJobApplicationsScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [applications, setApplications] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    try {
      const [appsRes, jobList] = await Promise.all([
        apiService.getApplications(user?.id),
        fetchJobs().catch(() => []),
      ]);
      setApplications(appsRes?.applications || []);
      setJobs(jobList);
    } catch (e) { setApplications([]); }
    setLoading(false); setRefreshing(false);
  }, [user?.id]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { const unsub = navigation.addListener('focus', () => load(true)); return unsub; }, [navigation, load]);

  const visible = applications.filter(a => filter === 'All' || appBucket(a.status) === filter);

  return (
    <View style={s.root}>
      <BlueHeader title="My Applications" onBack={() => navigation.goBack()} />
      <View style={s.sheet}>
        <ChipRow items={FILTERS} value={filter} onChange={setFilter} />
        {loading ? <ActivityIndicator color={C.blue} style={{ marginTop: 30 }} /> : (
          <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />} contentContainerStyle={{ paddingBottom: 20 }}>
            {visible.map(app => {
              const job = applicationJob(app, jobs) || { company: app.company, title: app.jobTitle };
              return (
                <Card key={app._id} onPress={() => navigation.navigate('JobApplicationDetails', { application: app })}>
                  <View style={s.row}>
                    <CompanyLogo job={{ ...job, company: job.company || app.company }} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={s.title} numberOfLines={2}>{app.jobTitle || job.title}</Text>
                      <Text style={s.company}>{app.company || job.company}</Text>
                      <Text style={s.date}>Applied on {formatDate(app.appliedAt)}</Text>
                    </View>
                    <StatusPill label={appStatusLabel(app.status)} tone={appStatusTone(app.status)} />
                  </View>
                </Card>
              );
            })}
            {!visible.length ? (
              <View style={s.empty}>
                <Ionicons name="clipboard-outline" size={40} color={C.blueLine} />
                <Text style={s.emptyText}>{applications.length ? 'No applications in this category.' : 'No applications yet. Apply to a job and track it here.'}</Text>
              </View>
            ) : null}
          </ScrollView>
        )}
      </View>
      <ModuleBar items={JOB_BAR} active="applications" navigation={navigation} />
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  sheet: { flex: 1, backgroundColor: C.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, marginTop: -12 },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  title: { fontSize: 15, fontWeight: '800', color: C.text },
  company: { fontSize: 13, color: C.muted, marginTop: 2 },
  date: { fontSize: 12, color: C.muted, marginTop: 6 },
  empty: { alignItems: 'center', marginTop: 40, paddingHorizontal: 30 },
  emptyText: { color: C.muted, marginTop: 8, textAlign: 'center' },
});
