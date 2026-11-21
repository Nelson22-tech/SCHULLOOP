// Student Portal documents (board #5). Real items only: admission confirmations and verified payment receipts.
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Btn, C, Card, IconTile, ModuleBar, PORTAL_BAR, WhiteHeader } from '../../shared/ui/kit';
import apiService from '../../shared/services/apiService';
import { API_BASE_URL } from '../../shared/config/api';

const formatDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

export const StudentDocumentsScreen = ({ navigation }) => {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [apps, pays] = await Promise.all([
      apiService.request('/admissions/mine').catch(() => ({ applications: [] })),
      apiService.getPayments().catch(() => ({ payments: [] })),
    ]);
    const items = [];
    (apps.applications || []).forEach((a) => {
      items.push({
        key: `app-${a._id}`,
        name: `Application Confirmation${a.applicationNumber ? ` - ${a.applicationNumber}` : ''}`,
        date: a.submittedAt || a.createdAt,
        url: `${API_BASE_URL}/admissions/${a._id}/confirmation`,
      });
    });
    (pays.payments || []).filter((p) => p.status === 'completed').forEach((p) => {
      items.push({
        key: `pay-${p._id}`,
        name: `Payment Receipt${p.schoolId?.name ? ` - ${p.schoolId.name}` : ''}`,
        date: p.updatedAt || p.createdAt,
        url: apiService.getReceiptUrl(p._id),
      });
    });
    items.sort((x, y) => new Date(y.date || 0) - new Date(x.date || 0));
    setDocs(items);
    setLoading(false);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const download = async (item) => {
    try {
      await Linking.openURL(item.url);
    } catch (e) {
      Alert.alert('Documents', e.message || 'Unable to open the document.');
    }
  };

  const goBack = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('StudentPortal'));

  return (
    <View style={styles.screen}>
      <WhiteHeader title="Documents" onBack={goBack} />
      {loading ? <ActivityIndicator color={C.blue} style={{ marginTop: 40 }} /> : (
        <ScrollView contentContainerStyle={{ paddingTop: 14, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
          {docs.length ? docs.map((item) => (
            <Card key={item.key} style={styles.row}>
              <IconTile name="document-text" box={42} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.meta}>PDF{formatDate(item.date) ? ` • ${formatDate(item.date)}` : ''}</Text>
              </View>
              <TouchableOpacity activeOpacity={0.85} style={styles.dl} onPress={() => download(item)}>
                <Text style={styles.dlText}>Download</Text>
              </TouchableOpacity>
            </Card>
          )) : (
            <View style={styles.empty}>
              <IconTile name="folder-open" box={56} size={28} round={28} />
              <Text style={styles.emptyTitle}>No documents yet</Text>
              <Text style={styles.emptyText}>Application confirmations and payment receipts will appear here once you apply or pay.</Text>
              <Btn title="Explore schools" onPress={() => navigation.navigate('MainTabs', { screen: 'ExploreTab' })} style={{ marginTop: 16, paddingHorizontal: 24 }} />
            </View>
          )}
        </ScrollView>
      )}
      <ModuleBar items={PORTAL_BAR} active="documents" navigation={navigation} />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  row: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: 14, fontWeight: '800', color: C.text },
  meta: { fontSize: 12, color: C.muted, marginTop: 3 },
  dl: { backgroundColor: C.blue, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, marginLeft: 8 },
  dlText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  empty: { alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, padding: 26, borderRadius: 16, borderWidth: 1, borderColor: C.border },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: C.text, marginTop: 12 },
  emptyText: { textAlign: 'center', fontSize: 12, color: C.muted, lineHeight: 19, marginTop: 8 },
});
