// Student Portal home (Student Portal board #1). Progress is computed from real application status only.
import { useCallback, useContext, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { BlueHeader, C, Card, IconBtn, Initials, ModuleBar, PORTAL_BAR, shadow } from '../../shared/ui/kit';
import apiService from '../../shared/services/apiService';
import { AuthContext } from '../auth/AuthContext';

const RING = 84;
const THICK = 9;

// Percentage of the admissions journey reached by the most advanced application.
const STEP_PERCENT = { submitted: 33, under_review: 67, accepted: 100, rejected: 100 };
const STATUS_TEXT = { submitted: 'Submitted', under_review: 'In Progress', accepted: 'Accepted', rejected: 'Decision made' };

// Progress ring built from Views: two half-circles rotated to reveal the filled arc.
const ProgressRing = ({ percent }) => {
  const p = Math.max(0, Math.min(100, percent));
  const deg = (p / 100) * 360;
  const half = RING / 2;
  const halfStyle = { position: 'absolute', width: half, height: RING, overflow: 'hidden' };
  const disc = (extra) => ({
    position: 'absolute', width: RING, height: RING, borderRadius: half, borderWidth: THICK,
    borderColor: C.blue, ...extra,
  });
  return (
    <View style={{ width: RING, height: RING, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: RING, height: RING, borderRadius: half, borderWidth: THICK, borderColor: C.blueSoft }} />
      {p > 0 ? (
        <>
          {/* right half: fills for the first 180 degrees */}
          <View style={[halfStyle, { left: half }]}>
            <View style={disc({ left: -half, transform: [{ rotate: `${Math.min(deg, 180) - 180}deg` }], borderLeftColor: 'transparent', borderBottomColor: 'transparent', borderTopColor: C.blue, borderRightColor: C.blue })} />
          </View>
          {/* left half: fills for the remaining degrees */}
          {deg > 180 ? (
            <View style={[halfStyle, { left: 0 }]}>
              <View style={disc({ left: 0, transform: [{ rotate: `${deg - 360}deg` }], borderRightColor: 'transparent', borderTopColor: 'transparent', borderLeftColor: C.blue, borderBottomColor: C.blue })} />
            </View>
          ) : null}
        </>
      ) : null}
      <Text style={styles.pct}>{Math.round(p)}%</Text>
    </View>
  );
};

const Tile = ({ icon, title, sub, onPress }) => (
  <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.tile}>
    <View style={styles.tileIcon}><Ionicons name={icon} size={20} color={C.blue} /></View>
    <Text style={styles.tileTitle}>{title}</Text>
    <Text style={styles.tileSub}>{sub}</Text>
  </TouchableOpacity>
);

export const StudentPortalScreen = ({ navigation }) => {
  const auth = useContext(AuthContext) || {};
  const user = auth.user || {};
  const name = user.fullName || user.name || 'Student';
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const result = await apiService.request('/admissions/mine');
      setApps(result.applications || []);
    } catch (e) {
      setApps([]);
    } finally {
      setLoading(false);
    }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const percent = apps.reduce((best, a) => Math.max(best, STEP_PERCENT[a.status] || 0), 0);
  const lead = apps.find((a) => (STEP_PERCENT[a.status] || 0) === percent && percent > 0);
  const statusText = lead ? (STATUS_TEXT[lead.status] || 'In Progress') : 'No application yet';

  let nextStep = 'Find a school and apply';
  let nextRoute = () => navigation.navigate('MainTabs', { screen: 'ExploreTab' });
  if (lead) {
    nextRoute = () => navigation.navigate('ApplicationDetails', { application: lead });
    if (lead.status === 'submitted') nextStep = 'Wait for school review';
    else if (lead.status === 'under_review') nextStep = 'Wait for the decision';
    else nextStep = 'View application decision';
  }

  return (
    <View style={styles.screen}>
      <BlueHeader
        brand
        onBack={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs', { screen: 'HomeTab' }))}
        right={(
          <>
            <IconBtn name="notifications-outline" onPress={() => navigation.navigate('Notifications')} />
            <TouchableOpacity style={{ marginLeft: 14 }} onPress={() => navigation.navigate('StudentProfile')}>
              <Initials name={name} size={34} bg={C.blueDark} />
            </TouchableOpacity>
          </>
        )}
      >
        <View style={styles.hello}>
          <Initials name={name} size={46} bg={C.blueDark} />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={styles.helloName} numberOfLines={1}>Hello, {name}</Text>
            <Text style={styles.helloSub}>Student Portal</Text>
          </View>
        </View>
      </BlueHeader>

      <ScrollView contentContainerStyle={{ paddingTop: 16, paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
        <Card style={{ padding: 16 }}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>Your Progress</Text>
            <Ionicons name="ellipsis-horizontal" size={18} color={C.muted} />
          </View>
          {loading ? <ActivityIndicator color={C.blue} style={{ marginVertical: 24 }} /> : (
            <View style={styles.progressRow}>
              <ProgressRing percent={percent} />
              <View style={{ flex: 1, marginLeft: 18 }}>
                <Text style={styles.appLabel}>Application</Text>
                <Text style={styles.appStatus}>{statusText}</Text>
                <View style={styles.sep} />
                <TouchableOpacity style={styles.nextRow} onPress={nextRoute} activeOpacity={0.8}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.nextLabel}>Next Step</Text>
                    <Text style={styles.nextText}>{nextStep}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={C.blue} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </Card>

        <View style={styles.grid}>
          <Tile icon="document-text" title="My Applications" sub="Track your applications" onPress={() => navigation.navigate('MyApplications')} />
          <Tile icon="card" title="Payments" sub="View receipts & history" onPress={() => navigation.navigate('PaymentHistory')} />
          <Tile icon="folder" title="Documents" sub="Access your files" onPress={() => navigation.navigate('Documents')} />
          <Tile icon="help-buoy" title="Support" sub="Get help & contact" onPress={() => navigation.navigate('Settings')} />
        </View>
      </ScrollView>
      <ModuleBar items={PORTAL_BAR} active="home" navigation={navigation} />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  hello: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  helloName: { color: '#fff', fontSize: 18, fontWeight: '800' },
  helloSub: { color: '#D6E5FF', fontSize: 13, marginTop: 2 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: C.text },
  progressRow: { flexDirection: 'row', alignItems: 'center' },
  pct: { fontSize: 19, fontWeight: '800', color: C.text },
  appLabel: { fontSize: 14, fontWeight: '800', color: C.text },
  appStatus: { fontSize: 13, color: C.blue, marginTop: 2 },
  sep: { height: 1, backgroundColor: C.border, marginVertical: 10 },
  nextRow: { flexDirection: 'row', alignItems: 'center' },
  nextLabel: { fontSize: 12, color: C.muted },
  nextText: { fontSize: 14, fontWeight: '800', color: C.blue, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12 },
  tile: { width: '46%', marginHorizontal: '2%', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: C.border, ...shadow },
  tileIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: C.blueSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  tileTitle: { fontSize: 14, fontWeight: '800', color: C.text },
  tileSub: { fontSize: 12, color: C.muted, marginTop: 3 },
});
