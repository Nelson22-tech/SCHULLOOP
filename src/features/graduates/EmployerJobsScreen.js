import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BlueHeader, Btn, C, Card, IconBtn, StatusPill } from '../../shared/ui/kit';
import apiService from '../../shared/services/apiService';

export const EmployerJobsScreen = ({ navigation }) => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { const d = await apiService.getEmployerJobs(); setJobs(d.jobs || []); }
    catch (e) { Alert.alert('Jobs', e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <View style={s.container}>
      <BlueHeader title="My Job Listings" subtitle="Manage your opportunities" onBack={() => navigation.goBack()}
        right={<IconBtn name="add-circle-outline" size={26} onPress={() => navigation.navigate('PostJob')} />} />
      {loading ? <ActivityIndicator color={C.blue} style={{ marginTop: 40 }} /> : (
        <ScrollView contentContainerStyle={s.content}>
          {jobs.map(j => (
            <Card key={j._id}>
              <Text style={s.title}>{j.title}</Text>
              <Text style={s.company}>{j.company} · {j.location}</Text>
              <View style={s.row}>
                <StatusPill label={j.jobType || 'Full-time'} tone="blue" style={{ marginRight: 6 }} />
                <StatusPill label={j.active === false ? 'Closed' : 'Open'} tone={j.active === false ? 'amber' : 'green'} />
              </View>
              <Text style={s.muted}>{j.salary || 'Salary not specified'} · {(j.skills || []).slice(0, 5).join(' • ')}</Text>
              <Btn title="View applicants" style={s.btn} onPress={() => navigation.navigate('EmployerApplications', { jobId: j._id, jobTitle: j.title })} />
            </Card>
          ))}
          {!jobs.length ? (
            <View style={s.empty}>
              <Ionicons name="briefcase-outline" size={40} color={C.blueLine} />
              <Text style={s.emptyText}>No jobs posted. Publish your first opportunity to start receiving applications.</Text>
              <Btn title="Post a Job" style={{ marginTop: 14, paddingHorizontal: 24 }} onPress={() => navigation.navigate('PostJob')} />
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { paddingTop: 16, paddingBottom: 40 },
  title: { fontSize: 16, fontWeight: '800', color: C.text },
  company: { color: C.blue, fontWeight: '700', marginTop: 4, fontSize: 13 },
  row: { flexDirection: 'row', marginVertical: 10 },
  muted: { color: C.muted, fontSize: 12.5 },
  btn: { marginTop: 12, paddingVertical: 10 },
  empty: { alignItems: 'center', marginTop: 40, paddingHorizontal: 30 },
  emptyText: { color: C.muted, marginTop: 8, textAlign: 'center' },
});
