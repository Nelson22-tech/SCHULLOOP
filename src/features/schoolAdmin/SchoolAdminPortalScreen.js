// School Administrator Portal - matches the approved "School Admin Portal" preview.
// Wide screens: 250px navy sidebar. Phones: the navy navigation becomes a scrolling strip, as in the preview.
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StatusBar, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import apiService from '../../shared/services/apiService';
import { topPad } from '../../shared/ui/kit';
import { AuthContext } from '../auth/AuthContext';
import { P, Pill } from './portalKit';
import { AcademicsSection, AdmissionsSection, DashboardSection, GallerySection, ProfileSection } from './sectionsA';
import { AnalyticsSection, AnnouncementsSection, EnquiriesSection, SettingsSection, StaffSection, VerificationSection } from './sectionsB';

const NAV = [
  ['dashboard', 'Dashboard', 'grid-outline'], ['profile', 'School profile', 'business-outline'], ['gallery', 'Pictures & gallery', 'images-outline'],
  ['academics', 'Academics & facilities', 'library-outline'], ['admissions', 'Admissions', 'clipboard-outline'], ['enquiries', 'Enquiries', 'mail-outline'],
  ['announcements', 'Announcements', 'megaphone-outline'], ['verification', 'Verification', 'shield-checkmark-outline'], ['staff', 'Staff access', 'people-outline'],
  ['analytics', 'Analytics', 'bar-chart-outline'], ['settings', 'Settings', 'settings-outline'],
];
const SECTIONS = {
  dashboard: DashboardSection, profile: ProfileSection, gallery: GallerySection, academics: AcademicsSection, admissions: AdmissionsSection,
  enquiries: EnquiriesSection, announcements: AnnouncementsSection, verification: VerificationSection, staff: StaffSection, analytics: AnalyticsSection, settings: SettingsSection,
};

export const SchoolAdminPortalScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const { width } = useWindowDimensions();
  const wide = width >= 850;
  const scroller = useRef(null);
  const [page, setPage] = useState('dashboard');
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const [toastMsg, setToastMsg] = useState('');
  const timer = useRef(null);

  const toast = useCallback((m) => {
    setToastMsg(m); clearTimeout(timer.current); timer.current = setTimeout(() => setToastMsg(''), 2600);
  }, []);
  const reload = useCallback(async () => {
    try { const data = await apiService.getSchoolAdminMe(); setState({ loading: false, error: null, data }); }
    catch (e) { setState({ loading: false, error: e.message || 'Could not load your school', data: null }); }
  }, []);
  useEffect(() => { reload(); return () => clearTimeout(timer.current); }, [reload]);

  const go = useCallback((p) => { setPage(p); if (scroller.current) scroller.current.scrollTo({ y: 0, animated: true }); }, []);

  if (state.loading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: P.bg }}><ActivityIndicator color={P.blue} size="large" /></View>;
  if (state.error || !state.data) {
    return (
      <View style={{ flex: 1, backgroundColor: P.bg, alignItems: 'center', justifyContent: 'center', padding: 28 }}>
        <Ionicons name="business-outline" size={40} color={P.muted} />
        <Text style={{ fontSize: 18, fontWeight: '800', color: P.ink, marginTop: 12 }}>No school linked yet</Text>
        <Text style={{ color: P.muted, textAlign: 'center', marginTop: 8, lineHeight: 20 }}>{state.error || 'Claim your school from its page, then SchulLoop reviews the claim.'}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 18, backgroundColor: P.blue, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 10 }}><Text style={{ color: '#fff', fontWeight: '800' }}>Go back</Text></TouchableOpacity>
      </View>
    );
  }

  const { school, role, permissions } = state.data;
  const can = (p) => p === 'dashboard' || permissions.includes(p);
  const items = NAV.filter(([id]) => can(id));
  const current = items.some(([id]) => id === page) ? page : 'dashboard';
  const label = (NAV.find(([id]) => id === current) || NAV[0])[1];
  const firstName = String((state.data.user && state.data.user.fullName) || user?.fullName || '').trim().split(/\s+/)[0] || 'Administrator';
  const initials = String(state.data.user?.fullName || 'AD').trim().split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase();
  const ctx = { school, role, can, reload, go, toast, navigation, firstName, user: state.data.user };
  const Section = SECTIONS[current];

  const navButton = ([id, text, icon], strip) => {
    const on = id === current;
    return (
      <TouchableOpacity key={id} activeOpacity={0.8} onPress={() => go(id)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: strip ? 9 : 11, paddingHorizontal: 12, borderRadius: 10, backgroundColor: on ? 'rgba(255,255,255,0.11)' : 'transparent', marginBottom: strip ? 0 : 5, marginRight: strip ? 6 : 0 }}>
        <Ionicons name={icon} size={18} color={on ? '#fff' : '#d8e3f2'} />
        <Text style={{ color: on ? '#fff' : '#d8e3f2', fontSize: 14, fontWeight: on ? '700' : '500' }} numberOfLines={1}>{text}</Text>
      </TouchableOpacity>
    );
  };

  const topbar = (
    <View style={{ height: 64, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: P.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: wide ? 32 : 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        <TouchableOpacity onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs', { screen: 'HomeTab' }))} hitSlop={10} style={{ marginRight: 12 }} accessibilityLabel="Back to app">
          <Ionicons name="arrow-back" size={22} color={P.ink} />
        </TouchableOpacity>
        <Text style={{ color: P.muted, fontSize: 14, flexShrink: 1 }} numberOfLines={1}>School Portal / <Text style={{ fontWeight: '800', color: P.ink }}>{label}</Text></Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <TouchableOpacity onPress={() => navigation.navigate('Notifications')} hitSlop={8}><Ionicons name="notifications-outline" size={20} color={P.ink} /></TouchableOpacity>
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#e5eef9', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: P.navy, fontWeight: '800', fontSize: 13 }}>{initials}</Text></View>
        {wide ? <Text style={{ fontWeight: '800', fontSize: 12, color: P.ink }}>{role === 'owner' ? 'Administrator' : 'Staff'}</Text> : null}
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, flexDirection: wide ? 'row' : 'column', backgroundColor: P.bg }}>
      <StatusBar barStyle={wide ? 'dark-content' : 'light-content'} />
      {wide ? (
        <View style={{ width: 250, backgroundColor: P.navy, paddingTop: 24, paddingHorizontal: 16, paddingBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 22 }}>
            <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.13)', alignItems: 'center', justifyContent: 'center' }}>
              <Image source={require('../../../assets/images/schulloop-logo-mark.png')} style={{ width: 24, height: 24 }} resizeMode="contain" />
            </View>
            <Text style={{ color: '#fff', fontSize: 19, fontWeight: '800' }}>SchulLoop</Text>
          </View>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.13)', borderRadius: 14, padding: 12, marginBottom: 22 }}>
            <Text style={{ color: '#b8c9e2', fontSize: 11, marginBottom: 4 }}>SCHOOL PORTAL</Text>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }} numberOfLines={2}>{school.name}</Text>
            <View style={{ marginTop: 8 }}>{school.verificationStatus === 'verified' ? <Pill tone="green" label="Verified" /> : <Pill label={school.verificationStatus === 'claimed' ? 'Pending verification' : 'Unverified'} />}</View>
          </View>
          <Text style={{ color: '#9fb4d2', fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginLeft: 10, marginBottom: 8 }}>WORKSPACE</Text>
          <ScrollView showsVerticalScrollIndicator={false}>{items.map((n) => navButton(n, false))}</ScrollView>
          <Text style={{ color: '#b8c9e2', fontSize: 12, lineHeight: 19, marginTop: 14 }}>School workspace{'\n'}Signed in as {role === 'owner' ? 'owner' : 'staff'}</Text>
        </View>
      ) : (
        <View style={{ backgroundColor: P.navy, paddingTop: topPad, paddingBottom: 10 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12 }}>{items.map((n) => navButton(n, true))}</ScrollView>
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        {topbar}
        <ScrollView ref={scroller} contentContainerStyle={{ padding: wide ? 32 : 14, paddingBottom: 70, maxWidth: 1200, width: '100%', alignSelf: 'center' }} keyboardShouldPersistTaps="handled">
          <Section ctx={ctx} />
        </ScrollView>
        {toastMsg ? (
          <View pointerEvents="none" style={{ position: 'absolute', bottom: 22, left: 16, right: 16, alignItems: wide ? 'flex-end' : 'center' }}>
            <View style={{ backgroundColor: '#142d4f', paddingHorizontal: 17, paddingVertical: 12, borderRadius: 10 }}><Text style={{ color: '#fff', fontSize: 13 }}>{toastMsg}</Text></View>
          </View>
        ) : null}
      </View>
    </View>
  );
};
