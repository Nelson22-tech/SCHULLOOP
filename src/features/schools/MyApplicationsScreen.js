import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Btn, C, ChipRow, IconTile, StatusPill, WhiteHeader, shadow } from '../../shared/ui/kit';
import apiService from '../../shared/services/apiService';

const FILTERS = ['All', 'Pending', 'Under Review', 'Accepted', 'Rejected'];

const statusLabel = (status) => {
  const s = String(status || 'submitted').toLowerCase();
  if (s === 'submitted') return 'Pending';
  if (s === 'under_review') return 'Under Review';
  if (s === 'accepted') return 'Accepted';
  if (s === 'rejected') return 'Rejected';
  return s.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
};
const statusTone = (status) => {
  const label = statusLabel(status);
  return label === 'Accepted' ? 'green' : label === 'Rejected' ? 'red' : label === 'Pending' || label === 'Under Review' ? 'amber' : 'gray';
};
const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

export const MyApplicationsScreen = ({ navigation }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('All');

  const load = useCallback(async () => {
    try {
      const result = await apiService.request('/admissions/mine');
      setItems(result.applications || []);
      setError('');
    } catch (e) {
      setError(e.message || 'Could not load applications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const visible = useMemo(
    () => (filter === 'All' ? items : items.filter((item) => statusLabel(item.status) === filter)),
    [items, filter],
  );

  const canGoBack = navigation.canGoBack && navigation.canGoBack();

  const renderItem = ({ item }) => (
    <TouchableOpacity activeOpacity={0.85} style={styles.card} onPress={() => navigation.navigate('ApplicationDetails', { application: item })}>
      <IconTile name="school" box={46} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.school} numberOfLines={1}>{item.schoolId?.name || item.schoolName || 'School application'}</Text>
        <Text style={styles.program} numberOfLines={1}>{item.program || 'Programme not specified'}</Text>
        <Text style={styles.meta}>Application No: {item.applicationNumber || 'Pending'}</Text>
        <Text style={styles.meta}>Submitted: {formatDate(item.submittedAt || item.createdAt)}</Text>
      </View>
      <StatusPill label={statusLabel(item.status)} tone={statusTone(item.status)} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.screen}>
      <WhiteHeader title="My Applications" onBack={canGoBack ? () => navigation.goBack() : undefined} />
      <ChipRow items={FILTERS} value={filter} onChange={setFilter} />
      {loading ? (
        <ActivityIndicator color={C.blue} style={{ marginTop: 40 }} />
      ) : error ? (
        <TouchableOpacity onPress={load} style={styles.retry}><Text style={styles.retryText}>{error} · Tap to retry</Text></TouchableOpacity>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(x) => String(x._id)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 30 }}
          ListEmptyComponent={(
            <View style={styles.emptyCard}>
              <IconTile name="document-text" box={56} size={28} round={28} />
              <Text style={styles.emptyTitle}>{items.length ? `No ${filter.toLowerCase()} applications` : 'No applications yet'}</Text>
              <Text style={styles.empty}>
                {items.length ? 'Try another filter to see your other applications.' : 'Find a school and submit your first application to see its progress here.'}
              </Text>
              {!items.length ? <Btn title="Explore schools" onPress={() => navigation.navigate('SearchFilter')} style={{ marginTop: 16, paddingHorizontal: 22 }} /> : null}
            </View>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 12, flexDirection: 'row', alignItems: 'flex-start', ...shadow },
  school: { fontSize: 14, fontWeight: '800', color: C.text },
  program: { fontSize: 12, color: C.muted, marginTop: 2, marginBottom: 6 },
  meta: { fontSize: 11, color: C.muted, marginTop: 2 },
  emptyCard: { alignItems: 'center', backgroundColor: '#fff', padding: 26, borderRadius: 16, marginTop: 8, borderWidth: 1, borderColor: C.border },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: C.text, marginTop: 12 },
  empty: { textAlign: 'center', fontSize: 12, color: C.muted, lineHeight: 19, marginTop: 8 },
  retry: { backgroundColor: '#FFF4D9', padding: 15, borderRadius: 12, marginHorizontal: 16 },
  retryText: { color: '#946200', fontWeight: '700' },
});
