// Application Details (Student Portal board #3). Real application data from route.params.application.
import { Alert, Image, Linking, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Btn, C, Card, IconTile, ModuleBar, PORTAL_BAR, StatusPill, WhiteHeader } from '../../shared/ui/kit';
import { API_BASE_URL } from '../../shared/config/api';

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const STEPS = ['Submitted', 'Under Review', 'Decision'];

// Index of the last reached step and what the final step reads as.
const progressFor = (status) => {
  const s = String(status || 'submitted').toLowerCase();
  if (s === 'accepted') return { done: 3, decision: 'Accepted', tone: 'green' };
  if (s === 'rejected') return { done: 3, decision: 'Rejected', tone: 'red' };
  if (s === 'withdrawn') return { done: 1, decision: 'Withdrawn', tone: 'gray' };
  if (s === 'under_review') return { done: 1, current: 1, decision: 'Decision', tone: 'amber' };
  return { done: 1, current: 1, decision: 'Decision', tone: 'amber' };
};

const statusLabel = (status) => {
  const s = String(status || 'submitted').toLowerCase();
  if (s === 'submitted') return 'Pending';
  if (s === 'under_review') return 'Under Review';
  return s.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
};

const InfoRow = ({ label, value, last }) => (
  <View style={[styles.infoRow, !last && styles.infoBorder]}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text selectable style={styles.infoValue}>{value}</Text>
  </View>
);

export const ApplicationDetailsScreen = ({ navigation, route }) => {
  const app = route.params?.application || null;
  const goBack = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MyApplications'));

  if (!app) {
    return (
      <View style={styles.screen}>
        <WhiteHeader title="Application Details" onBack={goBack} />
        <View style={styles.empty}>
          <IconTile name="document-text" box={56} size={28} round={28} />
          <Text style={styles.emptyTitle}>No application selected</Text>
          <Text style={styles.emptyText}>Open an application from My Applications to see its details.</Text>
          <Btn title="My Applications" onPress={() => navigation.navigate('MyApplications')} style={{ marginTop: 16, paddingHorizontal: 24 }} />
        </View>
        <ModuleBar items={PORTAL_BAR} active="applications" navigation={navigation} />
      </View>
    );
  }

  const school = app.schoolId && typeof app.schoolId === 'object' ? app.schoolId : {};
  const schoolName = school.name || app.schoolName || 'School application';
  const place = [school.city, school.country].filter(Boolean).join(', ') || school.location || '';
  const imageUrl = school.imageUrl || app.imageUrl || '';
  const verified = school.verified === true || school.verificationStatus === 'verified';
  const progress = progressFor(app.status);
  const submitted = formatDate(app.submittedAt || app.createdAt);

  const downloadConfirmation = async () => {
    try {
      if (!app._id) throw new Error('This application has no confirmation document yet.');
      await Linking.openURL(`${API_BASE_URL}/admissions/${app._id}/confirmation`);
    } catch (e) {
      Alert.alert('Confirmation', e.message || 'Unable to open the confirmation document.');
    }
  };

  const share = async () => {
    try {
      await Share.share({ message: `Application ${app.applicationNumber || ''} to ${schoolName} (${app.program || ''}) - ${statusLabel(app.status)}` });
    } catch (e) {
      Alert.alert('Share', e.message || 'Unable to share');
    }
  };

  return (
    <View style={styles.screen}>
      <WhiteHeader title="Application Details" onBack={goBack} />
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <View style={styles.banner}>
          {imageUrl ? <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : (
            <View style={styles.bannerArt}><Ionicons name="school" size={90} color="rgba(255,255,255,0.18)" /></View>
          )}
          <View style={styles.bannerShade} />
          <View style={styles.bannerTop}>
            <View style={styles.crest}><Ionicons name="school" size={24} color={C.blue} /></View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.bannerName} numberOfLines={1}>{schoolName}</Text>
              {place ? <Text style={styles.bannerPlace} numberOfLines={1}>{place}</Text> : null}
            </View>
            {verified ? <View style={styles.verified}><Text style={styles.verifiedText}>Verified</Text></View> : null}
          </View>
        </View>

        <Card style={styles.infoCard}>
          <View style={styles.titleRow}>
            <Text style={styles.sectionTitle}>Application Information</Text>
            <StatusPill label={statusLabel(app.status)} tone={progress.tone} />
          </View>
          <InfoRow label="Application No." value={app.applicationNumber || 'Pending'} />
          <InfoRow label="Program" value={app.program || '—'} />
          <InfoRow label="Academic Year" value={app.academicYear || '—'} />
          <InfoRow label="Submission Date" value={submitted} last />
        </Card>

        <Card>
          <Text style={[styles.sectionTitle, { marginBottom: 16 }]}>Status</Text>
          <View style={styles.timeline}>
            {STEPS.map((step, i) => {
              const reached = i < progress.done;
              const current = progress.current === i;
              const label = i === 2 ? progress.decision : step;
              const decisionColor = i === 2 && reached ? (progress.tone === 'red' ? C.red : progress.tone === 'green' ? C.green : C.muted) : C.blue;
              return (
                <View key={step} style={styles.stepWrap}>
                  {i > 0 ? <View style={[styles.line, { backgroundColor: reached || current ? C.blue : C.blueLine }]} /> : null}
                  <View style={[styles.stepDot, reached && { backgroundColor: decisionColor, borderColor: decisionColor }, current && styles.stepCurrent]}>
                    {reached ? <Ionicons name={i === 2 && progress.tone === 'red' ? 'close' : 'checkmark'} size={16} color="#fff" /> : current ? <Text style={styles.stepNum}>{i + 1}</Text> : <Ionicons name="ellipse" size={8} color={C.blueLine} />}
                  </View>
                  <Text style={[styles.stepLabel, (reached || current) && { color: C.blue, fontWeight: '800' }]}>{label}</Text>
                </View>
              );
            })}
          </View>
        </Card>

        <View style={{ paddingHorizontal: 16 }}>
          <Btn title="Download Confirmation (PDF)" onPress={downloadConfirmation} />
          <Btn title="Share Application" variant="outline" onPress={share} style={{ marginTop: 10 }} />
        </View>
      </ScrollView>
      <ModuleBar items={PORTAL_BAR} active="applications" navigation={navigation} />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  banner: { height: 130, backgroundColor: C.blueDark, overflow: 'hidden', justifyContent: 'flex-start' },
  bannerArt: { ...StyleSheet.absoluteFillObject, alignItems: 'flex-end', justifyContent: 'center', paddingRight: 24, backgroundColor: C.blueDark },
  bannerShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(8,56,160,0.35)' },
  bannerTop: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  crest: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  bannerName: { color: '#fff', fontSize: 16, fontWeight: '800' },
  bannerPlace: { color: '#E3EEFF', fontSize: 12, marginTop: 2 },
  verified: { backgroundColor: C.green, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  verifiedText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  infoCard: { marginTop: 14 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: C.text },
  infoRow: { paddingVertical: 10 },
  infoBorder: { borderBottomWidth: 1, borderBottomColor: '#EDF2FA' },
  infoLabel: { fontSize: 12, color: C.muted },
  infoValue: { fontSize: 14, fontWeight: '700', color: C.text, marginTop: 3 },
  timeline: { flexDirection: 'row', paddingBottom: 4 },
  stepWrap: { flex: 1, alignItems: 'center' },
  line: { position: 'absolute', top: 14, right: '50%', width: '100%', height: 3 },
  stepDot: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: C.blueLine, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  stepCurrent: { borderColor: C.blue, backgroundColor: C.blue },
  stepNum: { color: '#fff', fontSize: 12, fontWeight: '800' },
  stepLabel: { fontSize: 12, color: C.muted, marginTop: 8 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: C.text, marginTop: 12 },
  emptyText: { textAlign: 'center', fontSize: 12, color: C.muted, lineHeight: 19, marginTop: 8 },
});
