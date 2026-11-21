import { useCallback, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../../shared/services/apiService';
import { AuthContext } from '../auth/AuthContext';
import { Btn, C, Card, StatusPill, topPad } from '../../shared/ui/kit';

const NAVY = '#0A2A66';
const NAVY_LIGHT = '#16407F';

// Nav strip. `tab` switches an in-screen section, `route` navigates to another screen.
const NAV = [
  { key: 'overview', label: 'Dashboard', icon: 'grid', tab: 'overview' },
  { key: 'users', label: 'Users', icon: 'people', tab: 'users' },
  { key: 'schools', label: 'Schools', icon: 'school', tab: 'schools' },
  { key: 'jobs', label: 'Jobs', icon: 'briefcase', route: 'JobListings' },
  { key: 'applications', label: 'Applications', icon: 'document-text', tab: 'applications' },
  { key: 'payments', label: 'Payments', icon: 'card', route: 'PaymentsManagement' },
  { key: 'subscriptions', label: 'Subscriptions', icon: 'ribbon', route: 'SubscriptionPlans' },
  { key: 'reports', label: 'Reports', icon: 'bar-chart', tab: 'reports' },
  { key: 'settings', label: 'Settings', icon: 'settings', route: 'Settings' },
];

const isPaid = (p) => /complete|success|paid|verified/.test(String(p.status || '').toLowerCase());
const fmtMoney = (n) => `$${Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const fmtNum = (n) => Number(n || 0).toLocaleString('en-US');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Real revenue per month for the last 6 months, from completed payments.
const revenueSeries = (payments) => {
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth(), label: MONTHS[d.getMonth()], value: 0 });
  }
  payments.filter(isPaid).forEach((p) => {
    const d = new Date(p.createdAt);
    const m = months.find((x) => x.year === d.getFullYear() && x.month === d.getMonth());
    if (m) m.value += Number(p.amount || 0);
  });
  return months;
};

const StatCard = ({ icon, tint, label, value, note, noteColor }) => {
  const { width } = useWindowDimensions();
  const narrow = width < 760;
  return (
    <View style={[styles.stat, narrow && styles.statNarrow, { width: width >= 1000 ? '22.5%' : '47%' }]}>
      <View style={[styles.statTop, narrow && { flexDirection: 'column', alignItems: 'flex-start', gap: 6 }]}>
        <View style={[styles.statIcon, { backgroundColor: tint + '1F' }]}><Ionicons name={icon} size={17} color={tint} /></View>
        <Text style={[styles.statLabel, narrow && { flex: 0 }]} numberOfLines={1}>{label}</Text>
      </View>
      <Text style={[styles.statValue, narrow && { fontSize: 19 }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      {note ? <Text style={[styles.statNote, { color: noteColor || C.green }]}>{note}</Text> : <Text style={styles.statNote}> </Text>}
    </View>
  );
};

// Line + area chart built from plain Views.
const RevenueChart = ({ series, top }) => {
  const [width, setWidth] = useState(0);
  const height = 130;
  const max = top || Math.max(...series.map((s) => s.value), 1);
  const step = width / series.length;
  const pts = series.map((s, i) => ({ x: step * i + step / 2, y: height - (s.value / max) * (height - 12) - 4, v: s.value }));
  return (
    <View>
      <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {[0, 1, 2, 3].map((g) => <View key={g} style={[styles.gridLine, { top: (height / 3) * g - (g === 3 ? 1 : 0) }]} />)}
        {width > 0 && pts.map((p, i) => (
          <View key={`a${i}`} style={{ position: 'absolute', left: p.x - step / 2, width: step, top: p.y, height: height - p.y, backgroundColor: C.blue, opacity: 0.1 }} />
        ))}
        {width > 0 && pts.slice(1).map((p, i) => {
          const a = pts[i];
          const dx = p.x - a.x;
          const dy = p.y - a.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          return <View key={`l${i}`} style={{ position: 'absolute', left: (a.x + p.x) / 2 - len / 2, top: (a.y + p.y) / 2 - 1.25, width: len, height: 2.5, borderRadius: 2, backgroundColor: C.blue, transform: [{ rotate: `${Math.atan2(dy, dx)}rad` }] }} />;
        })}
        {width > 0 && pts.map((p, i) => <View key={`d${i}`} style={[styles.dot, { left: p.x - 4, top: p.y - 4 }]} />)}
      </View>
      <View style={styles.axis}>{series.map((s) => <Text key={s.label + s.month} style={[styles.axisText, { width: width ? step : undefined, flex: width ? undefined : 1 }]}>{s.label}</Text>)}</View>
    </View>
  );
};

const niceMax = (v) => {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
};
const tickLabel = (v) => (v >= 1000 ? `${+(v / 1000).toFixed(1)}k` : String(Math.round(v)));

const ChartWithAxis = ({ series }) => {
  const top = niceMax(Math.max(...series.map((x) => x.value), 1));
  return (
    <View style={{ flexDirection: 'row' }}>
      <View style={{ width: 34, height: 130 }}>
        {[0, 1, 2, 3].map((g) => <Text key={g} style={[styles.yLabel, { top: (130 / 3) * g - 6 }]}>{tickLabel(top * (1 - g / 3))}</Text>)}
      </View>
      <View style={{ flex: 1 }}><RevenueChart series={series} top={top} /></View>
    </View>
  );
};

const Sidebar = ({ tab, onNav, onClose, wide, compact }) => (
  <LinearGradient colors={['#0B3E94', '#072C6B', '#061F4D']} style={[styles.sidebar, compact && styles.sidebarCompact, !wide && !compact && styles.drawer]}>
    <View style={[styles.sideBrand, compact && styles.sideBrandCompact]}>
      <Image source={require('../../../assets/images/schulloop-logo-mark.png')} style={[styles.sideLogo, compact && { width: 30, height: 30 }]} resizeMode="contain" />
      <Text style={[styles.sideBrandText, compact && { flex: 0, fontSize: 13 }]} numberOfLines={1}>SchulLoop</Text>
      {!wide && !compact ? <TouchableOpacity onPress={onClose} hitSlop={10}><Ionicons name="close" size={22} color="#fff" /></TouchableOpacity> : null}
    </View>
    {NAV.map((item) => {
      const on = item.tab && item.tab === tab;
      return (
        <TouchableOpacity key={item.key} activeOpacity={0.8} onPress={() => onNav(item)} style={[styles.sideItem, compact && styles.sideItemCompact, on && styles.sideItemOn]}>
          <Ionicons name={`${item.icon}-outline`} size={compact ? 16 : 19} color="#fff" style={{ opacity: on ? 1 : 0.85 }} />
          <Text style={[styles.sideText, compact && { fontSize: 11 }, on && { fontWeight: '800', opacity: 1 }]} numberOfLines={1}>{item.label}</Text>
        </TouchableOpacity>
      );
    })}
  </LinearGradient>
);

export const AdminDashboardScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const { width: winWidth } = useWindowDimensions();
  const wide = winWidth >= 760;
  const [menuOpen, setMenuOpen] = useState(false);
  const initials = String(user?.fullName || user?.email || 'A').trim().split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase();
  const [tab, setTab] = useState('overview');
  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [pending, setPending] = useState([]);
  const [claims, setClaims] = useState([]);
  const [reports, setReports] = useState([]);
  const [payments, setPayments] = useState([]);
  const [jobCount, setJobCount] = useState(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true); else setRefreshing(true);
    try {
      const [a, u, c, s, r, p] = await Promise.all([apiService.getAdminAnalytics(), apiService.getAdminUsers(), apiService.getAdminClaims('pending'), apiService.getAdminSchools('verificationStatus=claimed'), apiService.getAdminReports(), apiService.getAdminPayments()]);
      setAnalytics(a); setUsers(u.users || []); setClaims(c.claims || []); setPending(s.schools || []); setReports(r.reports || []); setPayments(p.payments || []);
    } catch (e) { Alert.alert('Admin', e.message); } finally { setLoading(false); setRefreshing(false); }
    try {
      const j = await apiService.getJobs();
      const list = Array.isArray(j) ? j : (j.jobs || []);
      setJobCount(list.length);
    } catch (e) { setJobCount(null); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const search = async () => {
    if (!query.trim()) { setResults(null); return; }
    try { const d = await apiService.getAdminSchools(`q=${encodeURIComponent(query.trim())}&limit=20`); setResults(d.schools || []); }
    catch (e) { Alert.alert('School search', e.message); }
  };
  const verify = async id => { try { await apiService.verifySchool(id); await load(true); if (results) await search(); } catch (e) { Alert.alert('Verification', e.message); } };
  const confirmAction = (title, message, okLabel, run) => {
    // Alert buttons do not work on web, so fall back to window.confirm there.
    if (typeof window !== 'undefined' && window.confirm && !Alert.prompt) {
      if (window.confirm(`${title}\n\n${message}`)) run();
      return;
    }
    Alert.alert(title, message, [{ text: 'Cancel', style: 'cancel' }, { text: okLabel, style: 'destructive', onPress: run }]);
  };
  const unverify = (s) => confirmAction('Make unverified?', `${s.name} will lose its Verified badge and its full profile will be locked again.`, 'Unverify', async () => {
    try { await apiService.unverifySchool(s._id); await load(true); if (results) await search(); } catch (e) { Alert.alert('Unverify', e.message); }
  });
  const removeSchool = (s) => confirmAction('Delete school?', `${s.name} and its reviews and favourites will be permanently deleted. This cannot be undone.`, 'Delete', async () => {
    try { await apiService.deleteSchool(s._id); await load(true); if (results) await search(); } catch (e) { Alert.alert('Delete school', e.message); }
  });
  const viewDocs = async (school) => {
    try {
      const { docs } = await apiService.getSchoolVerificationDocs(school._id);
      if (!docs.length) { Alert.alert('Verification documents', 'This school has not uploaded any documents.'); return; }
      Alert.alert('Verification documents', school.name, [
        ...docs.slice(0, 3).map((d) => ({ text: d.name || d.kind, onPress: () => apiService.openPrivateFile(d.url).catch((e) => Alert.alert('Could not open', e.message)) })),
        { text: 'Close', style: 'cancel' },
      ]);
    } catch (e) { Alert.alert('Documents', e.message); }
  };
  const claimAction = async (id, ok) => { try { ok ? await apiService.approveClaim(id) : await apiService.rejectClaim(id, 'Claim evidence requires further verification'); await load(true); } catch (e) { Alert.alert('Claim', e.message); } };
  const reportAction = async (id, status) => { try { await apiService.updateAdminReport(id, status); await load(true); } catch (e) { Alert.alert('Report', e.message); } };

  const onNav = (item) => {
    setMenuOpen(false);
    if (item.route) navigation.navigate(item.route);
    else setTab(item.tab);
  };

  const series = revenueSeries(payments);
  const totalRevenue = payments.filter(isPaid).reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const thisMonth = series[5].value;
  const lastMonth = series[4].value;
  const change = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : null;

  const claimCard = (c) => (
    <Card key={c._id} style={styles.item}>
      <Text style={styles.name}>{c.schoolId?.name || 'School'}</Text>
      <Text style={styles.muted}>{c.userId?.fullName} · {c.schoolId?.city}, {c.schoolId?.country}</Text>
      <View style={styles.actions}>
        <Btn title="Approve" onPress={() => claimAction(c._id, true)} style={styles.smallBtn} />
        <Btn title="Reject" variant="outline" onPress={() => claimAction(c._id, false)} style={styles.smallBtn} />
      </View>
    </Card>
  );
  const Heading = ({ title, count }) => (
    <View style={styles.headingRow}><Text style={styles.heading}>{title}</Text>{count !== undefined ? <StatusPill label={String(count)} tone="blue" /> : null}</View>
  );
  const Empty = ({ icon, text }) => (
    <Card style={{ alignItems: 'center', paddingVertical: 26 }}><Ionicons name={icon} size={30} color={C.muted} /><Text style={[styles.muted, { marginTop: 8 }]}>{text}</Text></Card>
  );

  return (
    <View style={styles.container}>
      <Sidebar tab={tab} onNav={onNav} wide={wide} compact={!wide} />
      <View style={styles.main}>
        <View style={[styles.header, !wide && { paddingTop: topPad + 6 }]}>
          <TouchableOpacity onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs', { screen: 'HomeTab' }))} hitSlop={10} style={{ marginRight: 12 }} accessibilityLabel="Back to app">
            <Ionicons name="arrow-back" size={22} color={NAVY} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, !wide && { fontSize: 17 }]} numberOfLines={1}>Admin Dashboard</Text>
          {user?.userType === 'super_admin' ? (
            <TouchableOpacity style={styles.adminsBtn} onPress={() => navigation.navigate('ManageAdmins')}>
              <Ionicons name="shield-checkmark" size={15} color="#fff" /><Text style={styles.adminsText}>Admins</Text>
            </TouchableOpacity>
          ) : null}
          <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
        </View>

      {loading ? <View style={styles.center}><ActivityIndicator color={NAVY} size="large" /><Text style={styles.muted}>Loading administration dashboard...</Text></View> : (
        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />} contentContainerStyle={styles.scroll}>
          {tab === 'overview' && <>
            <Text style={styles.title}>Overview</Text>
            <View style={styles.statGrid}>
              <StatCard icon="people" tint={C.blue} label="Total Users" value={fmtNum(analytics?.totalUsers)} note={analytics ? `${fmtNum(analytics.totalConnections)} connections` : null} noteColor={C.muted} />
              <StatCard icon="school" tint={C.purple} label="Schools" value={fmtNum(analytics?.totalSchools)} note={analytics ? `${fmtNum(analytics.verifiedSchools)} verified` : null} noteColor={C.green} />
              <StatCard icon="briefcase" tint={C.orange} label="Job Posts" value={jobCount === null ? '-' : fmtNum(jobCount)} note={analytics ? `${fmtNum(analytics.totalApplications)} applications` : null} noteColor={C.muted} />
              <StatCard icon="cash" tint={C.green} label="Revenue" value={fmtMoney(totalRevenue)} note={change === null ? 'No prior month' : `${change >= 0 ? '+' : ''}${change}% this month`} noteColor={change !== null && change < 0 ? C.red : C.green} />
            </View>
            <Card style={styles.chartCard}>
              <View style={styles.chartHead}>
                <Text style={styles.chartTitle}>Revenue Overview</Text>
                <View style={styles.rangePill}><Text style={styles.rangeText}>Last 6 months</Text><Ionicons name="chevron-down" size={12} color={C.muted} /></View>
              </View>
              {totalRevenue > 0 ? <ChartWithAxis series={series} /> : <View style={styles.noChart}><Ionicons name="trending-up" size={28} color={C.muted} /><Text style={styles.muted}>No verified revenue in the last 6 months.</Text></View>}
            </Card>
            <Heading title="Quick actions" />
            <View style={styles.quick}>
              <Btn title="Verify schools" onPress={() => setTab('schools')} style={styles.smallBtn} />
              <Btn title="Review reports" variant="outline" onPress={() => setTab('reports')} style={styles.smallBtn} />
              <Btn title="Manage users" variant="outline" onPress={() => setTab('users')} style={styles.smallBtn} />
            </View>
            <Heading title="Pending claims" count={claims.length} />
            {claims.slice(0, 5).map(claimCard)}
            {!claims.length && <Empty icon="checkmark-done" text="No pending claims" />}
          </>}

          {tab === 'applications' && <>
            <Text style={styles.title}>Platform activity</Text>
            <View style={styles.statGrid}>
              {[['document-text', 'Applications', analytics?.totalApplications], ['card', 'Payments', analytics?.totalPayments], ['chatbubbles', 'Messages', analytics?.totalMessages], ['git-network', 'Connections', analytics?.totalConnections], ['search', 'Searches', analytics?.totalSearches], ['cloud-download', 'Imported', analytics?.importedSchools], ['flag', 'Open reports', analytics?.openReports], ['hourglass', 'Pending claims', analytics?.pendingClaims]].map((x) => (
                <StatCard key={x[1]} icon={x[0]} tint={C.blue} label={x[1]} value={fmtNum(x[2])} />
              ))}
            </View>
          </>}

          {tab === 'schools' && <>
            <Text style={styles.title}>School verification</Text>
            <Card>
              <Text style={styles.muted}>Imported schools stay outside the bulk queue; search here to verify any individual school.</Text>
              <View style={styles.searchRow}>
                <TextInput value={query} onChangeText={setQuery} onSubmitEditing={search} placeholder="School name, city or country" placeholderTextColor="#8493A8" style={styles.search} />
                <Btn title="Search" onPress={search} style={styles.smallBtn} />
              </View>
            </Card>
            {results?.map(s => (
              <Card key={s._id} style={styles.item}>
                <Text style={styles.name}>{s.name}</Text>
                <Text style={styles.muted}>{[s.city, s.region, s.country].filter(Boolean).join(', ')}</Text>
                <View style={styles.badges}>
                  <StatusPill label={s.type || 'School'} tone="blue" />
                  <StatusPill label={s.verificationStatus || 'unverified'} tone={s.verificationStatus === 'verified' ? 'green' : 'amber'} />
                  {s.source === 'imported' && <StatusPill label="OSM import" tone="gray" />}
                </View>
                <View style={styles.actions}>
                  {s.verificationStatus !== 'verified'
                    ? <Btn title="Verify school" onPress={() => verify(s._id)} style={styles.smallBtn} />
                    : <Btn title="Make unverified" variant="outline" onPress={() => unverify(s)} style={styles.smallBtn} />}
                  <Btn title="Documents" variant="outline" onPress={() => viewDocs(s)} style={styles.smallBtn} />
                  <Btn title="Delete" variant="outline" onPress={() => removeSchool(s)} style={styles.smallBtn} />
                </View>
              </Card>
            ))}
            <Heading title="Pending claims" count={claims.length} />
            {claims.map(claimCard)}
            <Heading title="Pending submitted schools" count={pending.length} />
            {pending.map(s => (
              <Card key={s._id} style={styles.item}>
                <Text style={styles.name}>{s.name}</Text>
                <Text style={styles.muted}>{s.city}, {s.country}</Text>
                <View style={styles.actions}><Btn title="Verify" onPress={() => verify(s._id)} style={styles.smallBtn} /></View>
              </Card>
            ))}
          </>}

          {tab === 'users' && <>
            <Heading title="Platform users" count={users.length} />
            {users.map(u => (
              <Card key={u.id || u._id || u.email} style={styles.item}>
                <View style={styles.userRow}>
                  <View style={{ flex: 1 }}><Text style={styles.name}>{u.fullName}</Text><Text style={styles.muted}>{u.email}</Text></View>
                  <StatusPill label={u.userType || 'user'} tone={u.userType?.includes('admin') ? 'green' : 'gray'} />
                </View>
              </Card>
            ))}
            {!users.length && <Empty icon="people-outline" text="No users yet" />}
          </>}

          {tab === 'payments' && <>
            <Heading title="Payment management" count={payments.length} />
            {payments.map(p => (
              <Card key={p._id} style={styles.item}>
                <Text style={styles.name}>{p.reference || 'Payment'}</Text>
                <Text style={styles.muted}>{p.userId?.fullName || p.userId?.email || 'Account'}{p.schoolId?.name ? ` · ${p.schoolId.name}` : ''}</Text>
                <View style={[styles.userRow, { marginTop: 8 }]}>
                  <Text style={[styles.name, { flex: 1 }]}>${Number(p.amount || 0).toLocaleString()} {p.currency || 'USD'}</Text>
                  <StatusPill label={p.status === 'completed' ? 'Verified paid' : (p.status || 'pending')} tone={p.status === 'completed' ? 'green' : 'amber'} />
                </View>
                <Text style={styles.muted}>{p.createdAt ? new Date(p.createdAt).toLocaleString() : ''}</Text>
              </Card>
            ))}
            {!payments.length && <Empty icon="card-outline" text="No payments yet" />}
          </>}

          {tab === 'reports' && <>
            <Heading title="Moderation reports" count={reports.length} />
            {reports.map(r => (
              <Card key={r._id} style={styles.item}>
                <Text style={styles.name}>{r.targetUserId?.fullName || 'Reported profile'}</Text>
                <Text style={styles.muted}>Reported by {r.reporterId?.fullName || 'User'}</Text>
                <Text style={styles.reason}>{r.reason}</Text>
                <StatusPill label={r.status || 'open'} tone={r.status === 'open' ? 'amber' : 'gray'} />
                <View style={styles.actions}>
                  <Btn title="Mark reviewed" onPress={() => reportAction(r._id, 'reviewed')} style={styles.smallBtn} />
                  <Btn title="Dismiss" variant="outline" onPress={() => reportAction(r._id, 'dismissed')} style={styles.smallBtn} />
                </View>
              </Card>
            ))}
            {!reports.length && <Empty icon="shield-checkmark-outline" text="No reports" />}
          </>}
        </ScrollView>
      )}
      </View>
      {!wide && menuOpen ? (
        <View style={styles.overlay}>
          <Sidebar tab={tab} onNav={onNav} onClose={() => setMenuOpen(false)} wide={false} />
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setMenuOpen(false)} />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  main: { flex: 1, minWidth: 0 },
  header: { backgroundColor: '#fff', paddingTop: 16, paddingBottom: 14, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  menuBtn: { marginRight: 2 },
  headerTitle: { flex: 1, fontSize: 21, fontWeight: '800', color: NAVY },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  sidebar: { width: 224, paddingTop: 22, paddingHorizontal: 14 },
  sidebarCompact: { width: 122, paddingTop: topPad + 8, paddingHorizontal: 6 },
  sideBrandCompact: { flexDirection: 'column', gap: 4, paddingHorizontal: 0, paddingBottom: 16, alignItems: 'center' },
  sideItemCompact: { gap: 6, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 10 },
  statNarrow: { padding: 10 },
  drawer: { width: 262, paddingTop: topPad + 8 },
  sideBrand: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 6, paddingBottom: 22 },
  sideLogo: { width: 34, height: 34 },
  sideBrandText: { flex: 1, color: '#fff', fontSize: 20, fontWeight: '800' },
  sideItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, marginBottom: 4 },
  sideItemOn: { backgroundColor: '#1565D8' },
  sideText: { color: '#fff', fontSize: 14.5, fontWeight: '600', opacity: 0.92 },
  overlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, flexDirection: 'row', zIndex: 30 },
  backdrop: { flex: 1, backgroundColor: 'rgba(5,20,50,0.45)' },
  yLabel: { position: 'absolute', right: 6, fontSize: 10, color: C.muted },
  statTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  container: { flex: 1, flexDirection: 'row', backgroundColor: C.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  topBar: { backgroundColor: NAVY, paddingTop: topPad, paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center' },
  brand: { color: '#fff', fontSize: 18, fontWeight: '800' },
  brandSub: { color: '#B9CBF0', fontSize: 12, marginTop: 1 },
  adminsBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: NAVY_LIGHT, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, gap: 5 },
  adminsText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  navWrap: { backgroundColor: NAVY, paddingBottom: 8 },
  navItem: { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, marginRight: 4, minWidth: 74 },
  navItemOn: { backgroundColor: NAVY_LIGHT },
  navText: { color: '#fff', fontSize: 11, marginTop: 3, opacity: 0.7, fontWeight: '600' },
  scroll: { paddingTop: 16, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: '800', color: C.text, marginHorizontal: 16, marginBottom: 12 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 11 },
  stat: { marginHorizontal: '1.5%', marginBottom: 10, backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.border },
  statIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statLabel: { flex: 1, fontSize: 12.5, color: C.muted },
  statValue: { fontSize: 22, fontWeight: '800', color: C.text, marginTop: 2 },
  statNote: { fontSize: 11, fontWeight: '700', marginTop: 4, color: C.muted },
  chartCard: { marginTop: 4, paddingBottom: 12 },
  chartHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  chartTitle: { fontSize: 15, fontWeight: '800', color: C.text },
  rangePill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  rangeText: { fontSize: 11, color: C.muted, fontWeight: '600' },
  gridLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: '#EDF2FA' },
  dot: { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff', borderWidth: 2, borderColor: C.blue },
  axis: { flexDirection: 'row', marginTop: 8 },
  axisText: { textAlign: 'center', fontSize: 10, color: C.muted },
  noChart: { alignItems: 'center', paddingVertical: 24, gap: 6 },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 10, marginBottom: 10 },
  heading: { fontSize: 16, fontWeight: '800', color: C.text },
  quick: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginHorizontal: 16, marginBottom: 6 },
  smallBtn: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 10 },
  item: { padding: 14 },
  name: { fontSize: 15, fontWeight: '700', color: C.text },
  muted: { color: C.muted, fontSize: 13, lineHeight: 19 },
  searchRow: { flexDirection: 'row', gap: 8, marginTop: 12, alignItems: 'center' },
  search: { flex: 1, backgroundColor: '#F8FAFF', borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, height: 42, color: C.text, fontSize: 14 },
  badges: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginVertical: 9 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reason: { color: C.text, marginVertical: 9, lineHeight: 20, fontSize: 13.5 },
});
