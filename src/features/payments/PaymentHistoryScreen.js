import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { C, ChipRow, IconTile, StatusPill, WhiteHeader, shadow } from '../../shared/ui/kit';
import apiService from '../../shared/services/apiService';

const FILTERS = ['All', 'Paid', 'Pending', 'Failed'];

const statusLabel = (status) => {
  const s = String(status || 'pending').toLowerCase();
  if (s === 'completed') return 'Paid';
  if (s === 'failed') return 'Failed';
  return s.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
};
const statusTone = (status) => {
  const label = statusLabel(status);
  return label === 'Paid' ? 'green' : label === 'Failed' ? 'red' : 'amber';
};
const methodLabel = (m) => ({ card: 'Card', mobile: 'Mobile Money', paypal: 'PayPal', bank: 'Bank Transfer', ussd: 'USSD' }[m] || String(m || 'Card'));

export const PaymentHistoryScreen = ({ navigation }) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('All');

  const loadPayments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiService.getPayments();
      setPayments(data.payments || []);
      setError(null);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const visible = useMemo(
    () => (filter === 'All' ? payments : payments.filter((p) => statusLabel(p.status) === filter)),
    [payments, filter],
  );

  const downloadReceipt = async (item) => {
    try {
      await apiService.getReceiptInfo(item._id);
      await Linking.openURL(`${apiService.getReceiptUrl(item._id)}`);
    } catch (e) {
      Alert.alert('Receipt', e.message || 'Unable to open receipt');
    }
  };

  const canGoBack = navigation.canGoBack && navigation.canGoBack();

  return (
    <View style={styles.container}>
      <WhiteHeader title="Payment History" onBack={canGoBack ? () => navigation.goBack() : undefined} />
      <ChipRow items={FILTERS} value={filter} onChange={setFilter} />
      {loading ? (
        <ActivityIndicator color={C.blue} style={{ marginTop: 40 }} />
      ) : error ? (
        <TouchableOpacity onPress={loadPayments} style={styles.retry}><Text style={styles.retryText}>{error} · Tap to retry</Text></TouchableOpacity>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={(
            <View style={styles.emptyCard}>
              <IconTile name="card" box={56} size={28} round={28} />
              <Text style={styles.emptyTitle}>{payments.length ? `No ${filter.toLowerCase()} payments` : 'No payments yet'}</Text>
              <Text style={styles.empty}>{payments.length ? 'Try another filter.' : 'Your verified payments and receipts will appear here.'}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.item}
              onPress={() => navigation.navigate('PaymentReceipt', { payment: item, schoolName: item.schoolId?.name })}
            >
              <IconTile name="receipt" box={46} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.school} numberOfLines={1}>{item.schoolId?.name || 'School payment'}</Text>
                <Text style={styles.meta} numberOfLines={1}>{item.reference}</Text>
                <Text style={styles.meta}>${Number(item.amount || 0).toLocaleString()} via {methodLabel(item.method)}</Text>
                <Text style={styles.meta}>{item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}</Text>
                {item.status === 'completed' ? (
                  <TouchableOpacity onPress={() => downloadReceipt(item)} hitSlop={8}>
                    <Text style={styles.link}>Download PDF Receipt</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              <StatusPill label={statusLabel(item.status)} tone={statusTone(item.status)} />
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  list: { paddingHorizontal: 16, paddingBottom: 30 },
  item: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#fff', padding: 14, marginBottom: 12, borderRadius: 16, borderWidth: 1, borderColor: C.border, ...shadow },
  school: { fontSize: 15, fontWeight: '800', color: C.text },
  meta: { fontSize: 12, color: C.muted, marginTop: 2 },
  link: { fontSize: 12, fontWeight: '700', color: C.blue, marginTop: 6 },
  emptyCard: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 28, marginTop: 20, borderWidth: 1, borderColor: C.border },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: C.text, marginTop: 12 },
  empty: { textAlign: 'center', color: C.muted, marginTop: 6, fontSize: 13 },
  retry: { margin: 16, padding: 14, borderRadius: 12, backgroundColor: C.redSoft },
  retryText: { color: C.red, fontWeight: '700', textAlign: 'center' },
});
