import { Alert, Linking, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Btn, C, Card, IconTile, topPad } from '../../shared/ui/kit';
import { API_BASE_URL } from '../../shared/config/api';

const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}, ${date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
};

export const ApplicationConfirmationScreen = ({ navigation, route }) => {
  const item = route.params?.confirmation || {};

  const confirmationUrl = () => {
    if (item.downloadPath) return `${API_BASE_URL.replace(/\/api\/?$/, '')}${item.downloadPath}`;
    if (item.applicationId) return `${API_BASE_URL}/admissions/${item.applicationId}/confirmation`;
    return null;
  };

  const downloadConfirmation = async () => {
    const url = confirmationUrl();
    try {
      if (url) await Linking.openURL(url);
      else await Share.share({ message: `Application ${item.applicationNumber || ''} to ${item.schoolName || 'school'} (${item.program || ''}) submitted.` });
    } catch (error) {
      Alert.alert('Confirmation', error.message || 'Unable to open the confirmation document.');
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.check}><Ionicons name="checkmark" size={48} color="#fff" /></View>
      <Text style={styles.title}>Application Submitted!</Text>
      <Text style={styles.subtitle}>Your application has been successfully submitted. Keep your application number for future reference.</Text>

      <View style={styles.numberBox}>
        <Text style={styles.numberLabel}>Application Number:</Text>
        <Text selectable style={styles.number}>{item.applicationNumber || 'Available in My Applications'}</Text>
      </View>

      <Card style={styles.detailCard}>
        <View style={styles.detailRow}>
          <IconTile name="school" />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.school}>{item.schoolName || 'Selected school'}</Text>
            <Text style={styles.program}>{item.program || '—'}{item.academicYear ? ` · ${item.academicYear}` : ''}</Text>
          </View>
        </View>
        <View style={[styles.detailRow, styles.dateRow]}>
          <IconTile name="calendar" />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.program}>Submission Date</Text>
            <Text style={styles.school}>{formatDateTime(item.submittedAt || new Date())}</Text>
          </View>
        </View>
      </Card>

      <View style={styles.notice}>
        <Text style={styles.noticeText}>This is an application confirmation, not an admission offer and not a payment receipt. If a fee is required, a separate receipt is issued only after the payment provider verifies the payment.</Text>
      </View>

      <View style={styles.actions}>
        <Btn title="View Application" onPress={() => navigation.navigate('MyApplications')} />
        <Btn title="Download Confirmation (PDF)" variant="outline" onPress={downloadConfirmation} style={{ marginTop: 12 }} />
        <Btn title="Return to dashboard" variant="white" onPress={() => navigation.navigate('MainTabs')} style={{ marginTop: 4 }} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  content: { paddingTop: topPad + 28, paddingBottom: 40 },
  check: { alignSelf: 'center', width: 92, height: 92, borderRadius: 46, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { textAlign: 'center', fontSize: 24, fontWeight: '800', color: C.green },
  subtitle: { textAlign: 'center', fontSize: 14, lineHeight: 21, color: C.muted, marginTop: 10, marginBottom: 22, paddingHorizontal: 32 },
  numberBox: { backgroundColor: C.blueSoft, marginHorizontal: 16, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginBottom: 16 },
  numberLabel: { fontSize: 12, color: C.blue },
  number: { fontSize: 22, fontWeight: '800', color: C.blueDark, marginTop: 4 },
  detailCard: { padding: 14 },
  detailRow: { flexDirection: 'row', alignItems: 'center' },
  dateRow: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#EDF2FA' },
  school: { fontSize: 14, fontWeight: '800', color: C.text },
  program: { fontSize: 12, color: C.muted, marginTop: 2 },
  notice: { backgroundColor: C.blueSoft, marginHorizontal: 16, padding: 12, borderRadius: 12, marginBottom: 16 },
  noticeText: { fontSize: 12, lineHeight: 18, color: '#425A7C' },
  actions: { paddingHorizontal: 16 },
});
