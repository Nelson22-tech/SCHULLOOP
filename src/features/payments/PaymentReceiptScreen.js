// Payment Receipt (board 10 / Student Portal #4). Real data only: route.params or the receipt API.
import { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Btn, C, Card, IconTile, WhiteHeader } from '../../shared/ui/kit';
import apiService from '../../shared/services/apiService';
import { AuthContext } from '../auth/AuthContext';

const formatDateTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} • ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
};

const Line = ({ label, value, bold }) => (
  <View style={styles.line}>
    <Text style={styles.lineLabel}>{label}</Text>
    <Text selectable style={[styles.lineValue, bold && { fontSize: 17 }]}>{value}</Text>
  </View>
);

export const PaymentReceiptScreen = ({ navigation, route }) => {
  const params = route.params || {};
  const auth = useContext(AuthContext) || {};
  const user = auth.user || {};
  const payment = params.payment || null;
  const [receipt, setReceipt] = useState(params.receipt || null);
  const [loading, setLoading] = useState(false);

  // Only completed payments have a receipt; fetch its number if we do not have it yet.
  useEffect(() => {
    if (!payment || !payment._id || receipt || payment.status !== 'completed') return;
    let alive = true;
    setLoading(true);
    apiService.getReceiptInfo(payment._id)
      .then((info) => { if (alive) setReceipt(info.receipt || null); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [payment, receipt]);

  const goBack = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('PaymentHistory'));

  if (!payment) {
    return (
      <View style={styles.screen}>
        <WhiteHeader title="Payment Receipt" onBack={goBack} />
        <View style={styles.empty}>
          <IconTile name="receipt" box={56} size={28} round={28} />
          <Text style={styles.emptyTitle}>No receipt to show</Text>
          <Text style={styles.emptyText}>A receipt is issued only after a payment is verified. Open one from your payment history.</Text>
          <Btn title="Payment History" onPress={() => navigation.navigate('PaymentHistory')} style={{ marginTop: 16, paddingHorizontal: 24 }} />
        </View>
      </View>
    );
  }

  const paid = payment.status === 'completed';
  const schoolName = params.schoolName || payment.schoolId?.name || '—';
  const studentName = user.fullName || user.name || '—';
  const currency = String(payment.currency || payment.schoolId?.currency || 'USD').toUpperCase();
  const amountText = `$${Number(payment.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
  const receiptNo = receipt?.receiptNumber || (loading ? 'Loading…' : '—');
  const paymentDate = formatDateTime(receipt?.issuedAt || payment.updatedAt || payment.createdAt);

  const download = async () => {
    try {
      if (!paid) throw new Error('A receipt is available only after the payment is verified.');
      await Linking.openURL(apiService.getReceiptUrl(payment._id));
    } catch (e) {
      Alert.alert('Receipt', e.message || 'Unable to open receipt');
    }
  };

  const share = async () => {
    try {
      await Share.share({
        message: [
          'SchulLoop Payment Receipt',
          `Receipt No: ${receipt?.receiptNumber || '—'}`,
          `School: ${schoolName}`,
          `Student: ${studentName}`,
          `Amount: ${amountText}`,
          `Payment Date: ${paymentDate}`,
          `Transaction Reference: ${payment.reference || '—'}`,
        ].join('\n'),
      });
    } catch (e) {
      Alert.alert('Share', e.message || 'Unable to share receipt');
    }
  };

  return (
    <View style={styles.screen}>
      <WhiteHeader title="Payment Receipt" onBack={goBack} />
      <ScrollView contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
        <View style={styles.brand}>
          <Ionicons name="school" size={30} color={C.blue} />
          <Text style={styles.brandText}>SchulLoop</Text>
        </View>

        <Card>
          <View style={styles.cardTop}>
            <Text style={styles.cardTitle}>Payment Receipt</Text>
            <View style={[styles.paid, !paid && { backgroundColor: C.amber }]}>
              <Text style={styles.paidText}>{paid ? 'PAID' : String(payment.status || 'PENDING').replace(/_/g, ' ').toUpperCase()}</Text>
            </View>
          </View>
          {loading ? <ActivityIndicator color={C.blue} style={{ marginBottom: 8 }} /> : null}
          <Line label="Receipt No" value={receiptNo} />
          <Line label="School" value={schoolName} bold />
          <Line label="Student" value={studentName} bold />
          <Line label="Amount" value={amountText} bold />
          <Line label="Payment Date" value={paymentDate} />
          <Line label="Transaction Reference" value={payment.reference || '—'} />

          {paid ? (
            <View style={styles.thanks}>
              <Text style={styles.thanksText}>Thank you for your payment!</Text>
              <Text style={styles.thanksText}>Your payment has been successfully verified.</Text>
            </View>
          ) : null}
        </Card>

        <View style={{ paddingHorizontal: 16 }}>
          <Btn title="Download Receipt (PDF)" onPress={download} disabled={!paid} />
          <Btn title="Share Receipt" variant="outline" onPress={share} style={{ marginTop: 10 }} />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  brand: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
  brandText: { fontSize: 22, fontWeight: '800', color: C.blue, marginLeft: 8 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardTitle: { fontSize: 17, fontWeight: '800', color: C.text },
  paid: { backgroundColor: C.green, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 4 },
  paidText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  line: { marginBottom: 10 },
  lineLabel: { fontSize: 12, color: C.muted },
  lineValue: { fontSize: 14, fontWeight: '700', color: C.blue, marginTop: 2 },
  thanks: { backgroundColor: C.blueSoft, borderRadius: 10, padding: 12, marginTop: 6 },
  thanksText: { fontSize: 12, color: C.blue, lineHeight: 18 },
  empty: { alignItems: 'center', padding: 32, marginTop: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: C.text, marginTop: 12 },
  emptyText: { fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 6 },
});
