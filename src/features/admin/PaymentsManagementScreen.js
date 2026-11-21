import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../../shared/services/apiService';
import { C, Chip, WhiteHeader } from '../../shared/ui/kit';

const FILTERS = ['All', 'Successful', 'Pending', 'Failed'];

// Normalise a backend payment status into one of the board's three states.
const statusOf = (payment) => {
  const s = String(payment.status || '').toLowerCase();
  if (/complete|success|paid|verified/.test(s)) return 'Successful';
  if (/fail|cancel|declin|reject/.test(s)) return 'Failed';
  return 'Pending';
};
const STATUS_STYLE = {
  Successful: { label: 'Success', color: C.green },
  Pending: { label: 'Pending', color: C.orange },
  Failed: { label: 'Failed', color: C.red },
};
const fmtDate = (value) => (value ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : '-');

export const PaymentsManagementScreen = ({ navigation }) => {
  const [payments, setPayments] = useState([]);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiService.getAdminPayments();
      setPayments(data.payments || []);
      setError(null);
    } catch (e) {
      setError(e.message || 'Could not load payments.');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const rows = payments.filter(p => filter === 'All' || statusOf(p) === filter);
  const back = navigation.canGoBack && navigation.canGoBack() ? () => navigation.goBack() : undefined;

  return (
    <View style={styles.container}>
      <WhiteHeader title="Payments" onBack={back} />
      <View style={styles.chips}>
        {FILTERS.map(f => <Chip key={f} label={f} active={filter === f} onPress={() => setFilter(f)} />)}
      </View>
      <View style={styles.thead}>
        <Text style={[styles.th, { flex: 1.1 }]}>Date</Text>
        <Text style={[styles.th, { flex: 1.2 }]}>User</Text>
        <Text style={[styles.th, { flex: 0.9 }]}>Amount</Text>
        <Text style={[styles.th, { flex: 0.9, textAlign: 'right' }]}>Status</Text>
      </View>
      {error ? <Text style={styles.error} onPress={load}>{error}  Tap to retry.</Text> : null}
      {loading && !payments.length ? <ActivityIndicator color={C.blue} style={{ marginTop: 30 }} /> : null}
      <FlatList
        data={rows}
        keyExtractor={(item, i) => item._id || String(i)}
        onRefresh={load}
        refreshing={loading && payments.length > 0}
        contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }}
        ListEmptyComponent={loading || error ? null : (
          <View style={styles.empty}>
            <Ionicons name="card-outline" size={34} color={C.blue} />
            <Text style={styles.emptyTitle}>No payments</Text>
            <Text style={styles.emptyText}>{filter === 'All' ? 'Platform payment records will appear here.' : `No ${filter.toLowerCase()} payments.`}</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const st = STATUS_STYLE[statusOf(item)];
          return (
            <View style={styles.tr}>
              <Text style={[styles.td, { flex: 1.1 }]}>{fmtDate(item.createdAt)}</Text>
              <Text style={[styles.td, { flex: 1.2 }]} numberOfLines={1}>{item.userId?.fullName || item.userId?.email || 'Account'}</Text>
              <Text style={[styles.td, { flex: 0.9 }]}>${Number(item.amount || 0).toFixed(2)}</Text>
              <View style={{ flex: 0.9, alignItems: 'flex-end' }}>
                <View style={[styles.pill, { backgroundColor: st.color + '1F' }]}><Text style={[styles.pillText, { color: st.color }]}>{st.label}</Text></View>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  chips: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12 },
  thead: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  th: { fontSize: 12, fontWeight: '800', color: C.text },
  tr: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#EDF2FA' },
  td: { fontSize: 12, color: C.text },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  pillText: { fontSize: 11, fontWeight: '800' },
  error: { color: C.red, padding: 14, fontSize: 13 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: C.text, marginTop: 10 },
  emptyText: { fontSize: 13, color: C.muted, marginTop: 4 },
});
