import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BlueHeader, Btn, C, Card, Initials, StatusPill, toneFor } from '../../shared/ui/kit';
import apiService from '../../shared/services/apiService';

const STATUSES = ['pending', 'reviewing', 'interview', 'accepted', 'rejected'];

export const EmployerApplicationsScreen = ({ route, navigation }) => {
  const { jobId, jobTitle } = route.params || {};
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { setData(await apiService.getEmployerJobApplications(jobId)); }
    catch (e) { Alert.alert('Applicants', e.message); }
    finally { setLoading(false); }
  }, [jobId]);
  useEffect(() => { load(); }, [load]);

  const status = async (id, next) => {
    try { await apiService.updateApplicationStatus(id, next); await load(); }
    catch (e) { Alert.alert('Application', e.message); }
  };

  return (
    <View style={s.container}>
      <BlueHeader title="Applicants" subtitle={jobTitle || data?.job?.title || 'Job'} onBack={() => navigation.goBack()} />
      {loading ? <ActivityIndicator color={C.blue} style={{ marginTop: 40 }} /> : (
        <ScrollView contentContainerStyle={s.content}>
          {data?.applications?.length ? data.applications.map(a => (
            <Card key={a._id}>
              <View style={s.row}>
                <Initials name={a.userId?.fullName || 'Student'} size={44} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={s.name}>{a.userId?.fullName || 'Student'}</Text>
                  <Text style={s.muted}>{a.userId?.email}</Text>
                  <Text style={s.muted}>{(a.userId?.skills || []).slice(0, 5).join(' • ')}</Text>
                </View>
                <StatusPill label={a.status} tone={toneFor(a.status)} />
              </View>
              <Text style={s.applied}>Applied {new Date(a.appliedAt).toLocaleDateString()}</Text>
              <View style={s.actions}>
                {STATUSES.filter(x => x !== a.status).map(x => (
                  <Btn key={x} title={x} variant={x === 'accepted' ? 'primary' : 'outline'} style={s.action} onPress={() => status(a._id, x)} />
                ))}
              </View>
            </Card>
          )) : (
            <View style={s.empty}>
              <Ionicons name="people-outline" size={40} color={C.blueLine} />
              <Text style={s.emptyText}>No applicants yet. Applications for this opportunity will appear here.</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { paddingTop: 16, paddingBottom: 40 },
  row: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: 15, fontWeight: '800', color: C.text },
  muted: { color: C.muted, fontSize: 12, marginTop: 2 },
  applied: { color: C.muted, marginTop: 10, fontSize: 12.5 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },
  action: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 10, marginRight: 6, marginBottom: 6 },
  empty: { alignItems: 'center', marginTop: 40, paddingHorizontal: 30 },
  emptyText: { color: C.muted, marginTop: 8, textAlign: 'center' },
});
