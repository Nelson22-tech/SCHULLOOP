// Payment Screen - Flutterwave Integration (board 9: Admission Fee Payment)
import { useContext, useEffect, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { Alert, Linking, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Btn, C, Card, Stepper, WhiteHeader } from '../../shared/ui/kit';
import apiService from '../../shared/services/apiService';
import { AuthContext } from '../auth/AuthContext';

export const PaymentScreen = ({ navigation, route }) => {
  const { schoolId, amount = 0, schoolName: paramSchoolName, applicationNumber } = route.params || {};
  const auth = useContext(AuthContext) || {};
  const authUser = auth.user || {};
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [loading, setLoading] = useState(false);
  const [schoolName, setSchoolName] = useState(paramSchoolName || '');
  const [formData, setFormData] = useState({
    fullName: authUser.fullName || authUser.name || '',
    email: authUser.email || '',
    phone: authUser.phone || '',
  });

  // Methods supported by the Flutterwave checkout flow below.
  const paymentMethods = [
    { id: 'card', name: 'Credit / Debit Card', icon: 'card' },
    { id: 'mobile', name: 'Mobile Money', icon: 'phone-portrait' },
    { id: 'paypal', name: 'PayPal', icon: 'logo-paypal' },
    { id: 'bank', name: 'Bank Transfer', icon: 'business' },
    { id: 'ussd', name: 'USSD', icon: 'keypad' },
  ];

  useEffect(() => {
    if (schoolName || !schoolId) return;
    let alive = true;
    apiService.getSchoolDetail(schoolId)
      .then((data) => {
        const school = (data && data.school) || data || {};
        if (alive && school.name) setSchoolName(school.name);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [schoolId, schoolName]);

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePayment = async () => {
    // Validation
    if (!formData.fullName || !formData.email) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const created = await apiService.createPayment({ schoolId, amount, paymentMethod });
      const redirectUrl = Linking.createURL('payment-result');
      const checkout = await apiService.startPaymentCheckout(created.payment._id, { paymentOptions: paymentMethod === 'mobile' ? 'mobilemoney' : paymentMethod, redirectUrl });
      if (!checkout.checkoutUrl) throw new Error('The payment provider did not return a checkout URL.');
      const result = await WebBrowser.openAuthSessionAsync(checkout.checkoutUrl, redirectUrl);
      const returnedUrl = result.url || '';
      const query = returnedUrl ? (Linking.parse(returnedUrl).queryParams || {}) : {};
      const transactionId = query.transaction_id || query.transactionId;
      if (transactionId) {
        const verification = await apiService.verifyPayment(String(transactionId));
        if (verification.verified) {
          navigation.navigate('PaymentReceipt', {
            payment: verification.payment,
            receipt: verification.receipt,
            schoolName,
            applicationNumber,
          });
        } else Alert.alert('Payment not confirmed', 'The payment provider did not confirm this transaction. No receipt has been issued.');
      } else if (result.type === 'cancel') {
        Alert.alert('Checkout closed', 'If you completed payment, reopen Payment History and check status. A receipt is issued only after provider verification.');
      } else {
        Alert.alert('Payment pending verification', 'The checkout returned without a transaction ID. The payment will remain pending until the provider verifies it.');
      }
    } catch (error) {
      Alert.alert('Payment Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const money = `$${Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <View style={styles.container}>
      <WhiteHeader title="Admission Fee Payment" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
        <Stepper steps={['Details', 'Payment', 'Receipt']} current={1} />

        <Text style={styles.heading}>Payment Summary</Text>
        <Card>
          <View style={styles.summaryRow}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.school} numberOfLines={2}>{schoolName || 'School'}</Text>
              <Text style={styles.sub}>Application Fee</Text>
              {applicationNumber ? <Text style={styles.appNo}>Application No: {applicationNumber}</Text> : null}
            </View>
            <Text style={styles.amount}>{money}</Text>
          </View>
        </Card>

        <Text style={styles.heading}>Payment Method</Text>
        <View>
          {paymentMethods.map((method) => {
            const on = paymentMethod === method.id;
            return (
              <TouchableOpacity
                key={method.id}
                activeOpacity={0.85}
                onPress={() => setPaymentMethod(method.id)}
                style={[styles.methodRow, on && styles.methodRowOn]}
              >
                <View style={[styles.radio, on && styles.radioOn]}>{on ? <View style={styles.radioDot} /> : null}</View>
                <Ionicons name={method.icon} size={22} color={C.blue} style={{ marginRight: 12 }} />
                <Text style={styles.methodName}>{method.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.heading}>Payer Details</Text>
        <Card>
          <Text style={styles.label}>Full Name <Text style={{ color: C.red }}>*</Text></Text>
          <TextInput
            style={styles.input}
            value={formData.fullName}
            onChangeText={(val) => updateField('fullName', val)}
            placeholder="Enter your full name"
            placeholderTextColor="#9AA6BC"
          />
          <Text style={styles.label}>Email <Text style={{ color: C.red }}>*</Text></Text>
          <TextInput
            style={styles.input}
            value={formData.email}
            onChangeText={(val) => updateField('email', val)}
            placeholder="Enter your email"
            placeholderTextColor="#9AA6BC"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={[styles.input, { marginBottom: 0 }]}
            value={formData.phone}
            onChangeText={(val) => updateField('phone', val)}
            placeholder="Enter your phone number"
            placeholderTextColor="#9AA6BC"
            keyboardType="phone-pad"
          />
        </Card>

        <View style={styles.actions}>
          <Btn title={loading ? 'Processing...' : 'Pay Now'} onPress={handlePayment} disabled={loading} />
          <Btn title="View Payment History" variant="outline" onPress={() => navigation.navigate('PaymentHistory')} style={{ marginTop: 10 }} />
        </View>

        <View style={styles.secure}>
          <Ionicons name="lock-closed" size={14} color={C.amber} />
          <Text style={styles.secureText}>Secure payment powered by <Text style={{ fontWeight: '800', color: C.blue }}>Flutterwave</Text></Text>
        </View>
        <Text style={styles.terms}>
          Payment credentials are entered only in the secure Flutterwave checkout. SchulLoop does not store your card number or CVV. By proceeding, you agree to our Terms of Service and Privacy Policy.
        </Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  heading: { fontSize: 17, fontWeight: '800', color: C.text, marginHorizontal: 16, marginTop: 10, marginBottom: 10 },
  summaryRow: { flexDirection: 'row', alignItems: 'flex-start' },
  school: { fontSize: 15, fontWeight: '800', color: C.text },
  sub: { fontSize: 13, color: C.muted, marginTop: 3 },
  appNo: { fontSize: 12, color: C.blue, marginTop: 4 },
  amount: { fontSize: 18, fontWeight: '800', color: C.text },
  methodRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, borderWidth: 1,
    borderColor: C.border, paddingVertical: 14, paddingHorizontal: 14, marginHorizontal: 16, marginBottom: 10,
  },
  methodRowOn: { borderColor: C.blue, backgroundColor: C.blueSoft },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#9AA6BC', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  radioOn: { borderColor: C.blue },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.blue },
  methodName: { fontSize: 14, fontWeight: '600', color: C.text, flex: 1 },
  label: { fontSize: 12, fontWeight: '700', color: C.text, marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, height: 46, fontSize: 14, color: C.text, marginBottom: 14 },
  actions: { paddingHorizontal: 16, marginTop: 10 },
  secure: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  secureText: { fontSize: 12, color: C.muted, marginLeft: 6 },
  terms: { fontSize: 11, color: '#8291A8', textAlign: 'center', lineHeight: 16, paddingHorizontal: 24, marginTop: 10 },
});
