import { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../auth/AuthContext';
import apiService from '../../shared/services/apiService';
import { Btn, C, Card, Field, Initials, ListRow, SectionTitle, topPad } from '../../shared/ui/kit';
import { CAPABILITY_LABELS, STAGES } from '../journey/journeyHelpers';

const roleLabel = (user) => {
  const plan = user.planName || user.plan || user.subscription?.planName;
  if (plan) return String(plan);
  const type = String(user.userType || 'student').replace(/_/g, ' ');
  return `${type.charAt(0).toUpperCase()}${type.slice(1)}`;
};

export const StudentProfileScreen = ({ navigation }) => {
  const auth = useContext(AuthContext) || {};
  const user = auth.user || {};
  const [name, setName] = useState(user.fullName || user.name || '');
  const [email] = useState(user.email || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [country, setCountry] = useState(user.country || '');
  const [goal, setGoal] = useState(user.studyGoal || '');
  const [bio, setBio] = useState(user.bio || '');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [stats, setStats] = useState({});
  const [headline, setHeadline] = useState('');

  // Real counts only: a tile is shown only when its number loaded and is above zero.
  useEffect(() => {
    if (!auth.user) return undefined;
    let alive = true;
    const load = async () => {
      const [conn, sum, journey, fl] = await Promise.all([
        apiService.getConnections().catch(() => null),
        apiService.getActivitiesSummary().catch(() => null),
        apiService.getJourney().catch(() => null),
        apiService.getMyFreelancerProfile().catch(() => null),
      ]);
      if (!alive) return;
      setStats({
        connections: conn && Array.isArray(conn.users) ? conn.users.length : null,
        saved: sum ? sum.savedSchools : null,
        projects: sum ? sum.projectsPosted : null,
      });
      const stage = journey && journey.journey && journey.journey.stage;
      const stageLabel = (STAGES.find(x => x.key === stage) || {}).label || CAPABILITY_LABELS[stage];
      setHeadline((fl && fl.freelancer && fl.freelancer.title) || stageLabel || '');
    };
    load();
    const unsub = navigation.addListener ? navigation.addListener('focus', load) : null;
    return () => { alive = false; if (unsub) unsub(); };
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    if (!auth.user) { setLoading(false); return () => { alive = false; }; }
    apiService.getMyProfile()
      .then((response) => {
        if (!alive || !response.user) return;
        const profile = response.user;
        setName(profile.fullName || ''); setPhone(profile.phone || '');
        setCountry(profile.country || ''); setGoal(profile.studyGoal || ''); setBio(profile.bio || '');
      })
      .catch(() => { /* Keep the locally cached profile editable when offline. */ })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const save = async () => {
    if (!name.trim()) return Alert.alert('Name required', 'Enter your full name before saving.');
    setSaving(true);
    try {
      if (typeof auth.updateProfile !== 'function') throw new Error('Your account session is not ready. Please sign in again.');
      await auth.updateProfile({ fullName: name.trim(), phone: phone.trim(), country: country.trim(), studyGoal: goal.trim(), bio: bio.trim() });
      Alert.alert('Profile saved', 'Your profile changes have been saved to your SchulLoop account.');
    } catch (error) {
      Alert.alert('Could not save profile', error.message || 'Check your connection and try again.');
    } finally { setSaving(false); }
  };

  const signOut = async () => {
    try {
      if (typeof auth.signOut === 'function') await auth.signOut();
    } catch (error) {
      Alert.alert('Sign out', error.message || 'Could not sign out.');
    }
  };

  const isAdmin = ['admin', 'super_admin'].includes(user.userType);
  const canGoBack = navigation.canGoBack && navigation.canGoBack();
  const go = (route) => () => navigation.navigate(route);

  const tiles = [
    { label: 'Connections', value: stats.connections },
    { label: 'Saved', value: stats.saved },
    { label: 'Projects', value: stats.projects },
  ].filter(x => typeof x.value === 'number' && x.value > 0);
  const subline = headline || String(goal || '');

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ paddingBottom: 32 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={s.header}>
        {canGoBack ? (
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12} style={s.back} accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
        ) : null}
        <View style={s.headRow}>
          <View style={s.avatarRing}><Initials name={name || 'Student'} size={72} bg="#1D74F5" /></View>
          <View style={{ flex: 1, marginLeft: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[s.name, { flexShrink: 1 }]} numberOfLines={1}>{name || 'Student profile'}</Text>
              {user.isVerified || user.emailVerified ? <Ionicons name="checkmark-circle" size={18} color="#fff" style={{ marginLeft: 6 }} /> : null}
            </View>
            {subline ? <Text style={s.headline} numberOfLines={1}>{subline}</Text> : null}
            <Text style={s.email} numberOfLines={1}>{roleLabel(user)}{email ? ` · ${email}` : ''}</Text>
          </View>
        </View>
        {tiles.length ? (
          <View style={s.statRow}>
            {tiles.map(x => (
              <View key={x.label} style={s.stat}>
                <Text style={s.statNum}>{x.value}</Text>
                <Text style={s.statLabel}>{x.label}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      <Card style={{ marginTop: 16 }}>
        <Text style={s.cardTitle}>About Me</Text>
        <Text style={s.about}>{bio ? bio : 'You have not added an introduction yet.'}</Text>
        <Btn title={editing ? 'Close editor' : 'Edit Profile'} onPress={() => setEditing(!editing)} />
      </Card>

      {editing ? (
        <Card>
          <Text style={s.cardTitle}>Edit profile</Text>
          {loading ? <View style={s.loading}><ActivityIndicator color={C.blue} /><Text style={s.loadingText}>Loading your saved profile...</Text></View> : null}
          <Field label="Full name" value={name} onChangeText={setName} placeholder="Your full name" />
          <Field label="Email address" value={email} editable={false} placeholder="Email address" autoCapitalize="none" keyboardType="email-address" />
          <Field label="Phone number" value={phone} onChangeText={setPhone} placeholder="Include country code" keyboardType="phone-pad" />
          <Field label="Country / region" value={country} onChangeText={setCountry} placeholder="Country where you study or live" />
          <Field label="Study or career goal" value={goal} onChangeText={setGoal} placeholder="e.g. Undergraduate engineering" />
          <Field label="About you" value={bio} onChangeText={setBio} placeholder="A short introduction" multiline textAlignVertical="top" style={{ marginBottom: 16 }} />
          {saving ? <ActivityIndicator color={C.blue} /> : <Btn title="Save profile" onPress={save} />}
        </Card>
      ) : null}

      <SectionTitle title="MY JOURNEY" />
      <Card style={s.menu}>
        <ListRow icon="person" title="Personal Information" onPress={() => setEditing(true)} />
        <ListRow icon="school" title="Education" onPress={() => navigation.navigate('JourneyEdit', { section: 'education' })} />
        <ListRow icon="ribbon" title="Qualifications" onPress={() => navigation.navigate('JourneyEdit', { section: 'qualifications' })} />
        <ListRow icon="construct" title="Skills and Experience" onPress={() => navigation.navigate('JourneyEdit', { section: 'skills' })} />
        <ListRow icon="trending-up" title="Career Progress" onPress={go('MyJourney')} last />
      </Card>

      <SectionTitle title="MY ACTIVITIES" />
      <Card style={s.menu}>
        <ListRow icon="layers" title="My Activities" subtitle="Saved schools, applications, projects and services" onPress={() => navigation.navigate('MainTabs', { screen: 'ActivitiesTab' })} last />
      </Card>

      <SectionTitle title="ACCOUNT" />
      <Card style={s.menu}>
        <ListRow icon="lock-closed" title="Profile and Privacy" onPress={go('ProfilePrivacy')} />
        <ListRow icon="shield-checkmark" title="Account Security" onPress={go('AccountSecurity')} />
        <ListRow icon="notifications" title="Notifications" onPress={go('Notifications')} />
        <ListRow icon="layers" title="Additional Capabilities" onPress={go('Capabilities')} last />
      </Card>

      <SectionTitle title="MORE" />
      <Card style={s.menu}>
        <ListRow icon="document-text" title="My Applications" onPress={go('MyApplications')} />
        <ListRow icon="heart" title="Saved Schools" onPress={go('Favorites')} />
        <ListRow icon="card" title="Payment History" onPress={go('PaymentHistory')} />
        <ListRow icon="ribbon" title="Subscription Plans" subtitle="Manage your plan and upgrades" onPress={go('SubscriptionPlans')} />
        <ListRow icon="settings" title="Settings" onPress={go('Settings')} />
        <ListRow icon="language" title="Language & Appearance" subtitle="Change language and theme" onPress={go('Settings')} />
        {isAdmin ? <ListRow icon="shield-checkmark" title="Admin Dashboard" subtitle="Platform administration" onPress={go('AdminDashboard')} /> : null}
        {user.userType === 'school' ? <ListRow icon="business" title="School Admin Portal" subtitle="Profile, admissions & enquiries" onPress={go('SchoolAdminPortal')} /> : null}
        <ListRow icon="log-out" title="Log out" onPress={signOut} last right={<Ionicons name="chevron-forward" size={18} color={C.red} />} />
      </Card>
    </ScrollView>
  );
};

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  header: { backgroundColor: C.blue, paddingTop: topPad, paddingHorizontal: 18, paddingBottom: 26 },
  back: { marginBottom: 8, alignSelf: 'flex-start' },
  headRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  avatarRing: { borderWidth: 3, borderColor: '#fff', borderRadius: 40, padding: 1 },
  name: { color: '#fff', fontSize: 21, fontWeight: '800' },
  planPill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#fff', borderRadius: 18, paddingHorizontal: 12, paddingVertical: 6, marginTop: 8 },
  planText: { color: C.blue, fontWeight: '800', fontSize: 13, marginLeft: 6 },
  headline: { color: '#fff', fontSize: 13, fontWeight: '600', marginTop: 3 },
  statRow: { flexDirection: 'row', marginTop: 18, backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 14, paddingVertical: 10 },
  stat: { flex: 1, alignItems: 'center' },
  statNum: { color: '#fff', fontSize: 18, fontWeight: '800' },
  statLabel: { color: '#D6E5FF', fontSize: 11, marginTop: 2 },
  about: { color: C.muted, fontSize: 13, lineHeight: 19, marginBottom: 12 },
  email: { color: '#D6E5FF', fontSize: 12, marginTop: 6 },
  menu: { paddingVertical: 4, paddingHorizontal: 14 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: C.text, marginBottom: 12 },
  loading: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  loadingText: { color: C.muted, fontSize: 12, marginLeft: 8 },
});
