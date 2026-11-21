import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BlueHeader, Btn, C, Card, IconTile, StatusPill } from '../../shared/ui/kit';
import apiService from '../../shared/services/apiService';

export const InterviewsScreen = ({ navigation }) => {
  const [items, setItems] = useState([]);

  const load = async () => {
    try { setItems((await apiService.getInterviews()).interviews || []); }
    catch (e) { Alert.alert('Interviews', e.message); }
  };
  useEffect(() => { load(); }, []);

  return (
    <View style={s.container}>
      <BlueHeader title="Interviews" subtitle="Your scheduled career interviews" onBack={navigation?.canGoBack?.() ? () => navigation.goBack() : undefined} />
      <ScrollView contentContainerStyle={s.content}>
        {items.map(item => (
          <Card key={String(item._id)}>
            <View style={s.row}>
              <IconTile name="videocam-outline" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={s.title}>{item.applicationId?.jobTitle || 'Interview'}</Text>
                <Text style={s.meta}>{new Date(item.scheduledAt).toLocaleString()}</Text>
              </View>
              {item.mode ? <StatusPill label={item.mode} tone="purple" /> : null}
            </View>
            {item.meetingUrl ? <Btn title="Open meeting" icon="open-outline" style={s.btn} onPress={() => Linking.openURL(item.meetingUrl).catch(() => {})} /> : null}
            <Text style={s.notes}>{item.notes || 'No notes'}</Text>
          </Card>
        ))}
        {!items.length ? (
          <View style={s.empty}>
            <Ionicons name="calendar-outline" size={40} color={C.blueLine} />
            <Text style={s.emptyText}>No interviews scheduled.</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { paddingTop: 16, paddingBottom: 40 },
  row: { flexDirection: 'row', alignItems: 'center' },
  title: { fontWeight: '800', fontSize: 16, color: C.text },
  meta: { color: C.blue, fontSize: 12.5, marginTop: 3, fontWeight: '600' },
  btn: { marginTop: 12, paddingVertical: 10 },
  notes: { color: C.muted, marginTop: 10, fontSize: 13 },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyText: { color: C.muted, marginTop: 8 },
});
