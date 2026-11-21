import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AuthContext } from '../auth/AuthContext';
import apiService from '../../shared/services/apiService';
import { C, Card, IconTile, Initials, ListRow, SearchField, SectionTitle, StatusPill, k, shadow } from '../../shared/ui/kit';

const SAMPLE_SCHOOLS = [
  { _id: 'sample-1', name: 'Global University', location: 'New York, USA', rating: 4.8, reviewCount: 124, verified: true },
];

const TILES = [
  { title: 'Find Schools', sub: 'Explore universities and colleges', icon: 'school', color: C.green, bg: C.greenSoft, route: 'SearchFilter' },
  { title: 'Student Connect', sub: 'Meet students, mentors & peers', icon: 'people', color: C.purple, bg: C.purpleSoft, route: 'StudentConnect' },
  { title: 'Jobs & Internships', sub: 'Discover opportunities for your future', icon: 'briefcase', color: '#6D4AE0', bg: '#ECE6FF', route: 'JobPortal' },
  { title: 'Scholarships', sub: 'Find education funding globally', icon: 'ribbon', color: C.orange, bg: C.amberSoft, route: 'Scholarships' },
  { title: 'Mentors', sub: 'Book 1-on-1 lessons with experts', icon: 'school', color: C.purple, bg: C.purpleSoft, route: 'Mentors' },
  { title: 'Events', sub: 'Workshops, meetups & webinars', icon: 'calendar', color: C.orange, bg: C.amberSoft, route: 'Events' },
  { title: 'Freelancers', sub: 'Post projects or find freelance work', icon: 'laptop', color: C.blue, bg: C.blueSoft, route: 'Freelance' },
  { title: 'Local Services', sub: 'Tutors, repairs, cleaning & more nearby', icon: 'construct', color: C.green, bg: C.greenSoft, route: 'LocalServices' },
];

const Stat = ({ icon, value, label }) => (
  <View style={styles.stat}>
    <Ionicons name={icon} size={18} color={C.blue} />
    <Text style={styles.statNum}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

export const DashboardScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext) || {};
  const [applicationCount, setApplicationCount] = useState('—');
  const [noticeCount, setNoticeCount] = useState('—');
  const [featured, setFeatured] = useState(null);
  const [query, setQuery] = useState('');
  const [nearby, setNearby] = useState([]);
  const [locStatus, setLocStatus] = useState('Finding schools near you...');
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const coords = useRef(null);
  const nextSkip = useRef(0);
  const busy = useRef(false);

  useEffect(() => {
    apiService.request('/admissions/mine').then(r => setApplicationCount(String((r.applications || []).length))).catch(() => setApplicationCount('0'));
    apiService.request('/notifications').then(r => setNoticeCount(String((r.notifications || []).filter(n => !n.read).length))).catch(() => setNoticeCount('0'));
    apiService.getSchools()
      .then(r => setFeatured((r.schools || [])[0] || SAMPLE_SCHOOLS[0]))
      .catch(() => setFeatured(SAMPLE_SCHOOLS[0]));
  }, []);

  // Load one page of nearby schools (verified first within each distance band, then closer first).
  const loadPage = useCallback(async (reset) => {
    if (busy.current || !coords.current) return;
    busy.current = true;
    setLoadingMore(true);
    try {
      const skip = reset ? 0 : nextSkip.current;
      const r = await apiService.getNearbySchools(coords.current.latitude, coords.current.longitude, null, skip, 20);
      const rows = r.schools || [];
      nextSkip.current = typeof r.nextSkip === 'number' ? r.nextSkip : skip + rows.length;
      setHasMore(Boolean(r.hasMore));
      setNearby((prev) => {
        const base = reset ? [] : prev;
        const seen = new Set(base.map((x) => x._id));
        return base.concat(rows.filter((x) => !seen.has(x._id)));
      });
      if (reset) {
        const d = rows[0] && rows[0].distance;
        if (!rows.length) setLocStatus('No schools with a known location yet.');
        else if (typeof d === 'number' && d > 50) setLocStatus(`Nearest school is about ${Math.round(d)} km away.`);
        else setLocStatus('Verified schools first, then closest to you. Keep scrolling for more.');
      }
    } catch (e) {
      setLocStatus('Could not load nearby schools. Check your connection and try again.');
    } finally {
      busy.current = false;
      setLoadingMore(false);
    }
  }, []);

  // Ask for location once on open, then start the endless nearby list.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (perm.status !== 'granted') {
          if (alive) setLocStatus('Allow location access to see schools near you.');
          return;
        }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!alive) return;
        coords.current = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        loadPage(true);
      } catch (e) {
        if (alive) setLocStatus('Could not get your location. Check location permission and try again.');
      }
    })();
    return () => { alive = false; };
  }, [loadPage]);

  // Load the next page when the user scrolls close to the bottom.
  const onScroll = ({ nativeEvent }) => {
    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
    if (hasMore && !busy.current && layoutMeasurement.height + contentOffset.y >= contentSize.height - 600) loadPage(false);
  };

  const fullName = (user && (user.name || user.fullName || [user.firstName, user.lastName].filter(Boolean).join(' '))) || '';
  const firstName = (user && user.firstName) || String(fullName).trim().split(' ')[0] || 'there';
  const isAdmin = user && (user.userType === 'admin' || user.userType === 'super_admin');
  const isSchoolRep = user && user.userType === 'school';
  const isSample = featured && String(featured._id).startsWith('sample-');

  const openFeatured = () => {
    if (featured && !isSample) navigation.navigate('SchoolDetail', { schoolId: featured._id });
    else navigation.navigate('SearchFilter');
  };

  return (
    <ScrollView style={k.screen} contentContainerStyle={{ paddingBottom: 28 }} showsVerticalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={200}>
      <View style={[k.header, { paddingBottom: 18 }]}>
        <View style={k.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greet}>Good morning,</Text>
            <Text style={styles.name} numberOfLines={1}>{firstName}</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Notifications')} hitSlop={10}>
            <Ionicons name="notifications-outline" size={24} color="#fff" />
            {noticeCount !== '—' && noticeCount !== '0' ? <View style={k.dot} /> : null}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('StudentProfile')} style={{ marginLeft: 14 }}>
            <Initials name={fullName || firstName} size={38} bg="#2F7BFF" />
          </TouchableOpacity>
        </View>
        <SearchField
          value={query}
          onChangeText={setQuery}
          placeholder="Search schools, jobs, scholarships..."
          onSubmitEditing={() => navigation.navigate('SearchFilter')}
        />
      </View>

      <View style={styles.grid}>
        {TILES.map(t => (
          <TouchableOpacity key={t.title} activeOpacity={0.85} style={styles.tile} onPress={() => navigation.navigate(t.route)}>
            <IconTile name={t.icon} color={t.color} bg={t.bg} box={38} size={20} round={10} />
            <Text style={styles.tileTitle}>{t.title}</Text>
            <Text style={styles.tileSub}>{t.sub}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <SectionTitle title="Featured Schools" action="View all" onAction={() => navigation.navigate('SearchFilter')} />
      {featured ? (
        <TouchableOpacity activeOpacity={0.9} onPress={openFeatured} style={styles.feat}>
          {featured.imageUrl
            ? <Image source={{ uri: featured.imageUrl }} style={styles.featImg} resizeMode="cover" />
            : <View style={[styles.featImg, styles.ph]}><Ionicons name="school" size={54} color="#7FA9F0" /></View>}
          <View style={styles.featBody}>
            <View style={{ flex: 1 }}>
              <Text style={styles.featName} numberOfLines={1}>{featured.name}</Text>
              <Text style={styles.featLoc} numberOfLines={1}>{featured.location}</Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={14} color={C.orange} />
                <Text style={styles.ratingText}>
                  {featured.rating || 'N/A'}{featured.reviewCount ? ` (${featured.reviewCount})` : ''}
                </Text>
              </View>
            </View>
            {featured.verified ? <StatusPill label="Verified" tone="green" /> : null}
          </View>
        </TouchableOpacity>
      ) : null}

      <View style={styles.stats}>
        <Stat icon="document-text-outline" value={applicationCount} label="Applications" />
        <Stat icon="notifications-outline" value={noticeCount} label="Unread alerts" />
      </View>

      <Card style={{ paddingVertical: 2 }}>
        <ListRow icon="school-outline" title="Student Portal" subtitle="Applications, payments & documents" onPress={() => navigation.navigate('StudentPortal')} last={!isAdmin && !isSchoolRep} />
        {isSchoolRep ? (
          <ListRow icon="business-outline" title="School Admin Portal" subtitle="Manage your school profile, admissions & enquiries" onPress={() => navigation.navigate('SchoolAdminPortal')} last={!isAdmin} />
        ) : null}
        {isAdmin ? (
          <ListRow icon="shield-checkmark-outline" title="Admin Dashboard" subtitle="Manage users, schools & payments" onPress={() => navigation.navigate('AdminDashboard')} last />
        ) : null}
      </Card>

      <SectionTitle title="Schools near you" action="View all" onAction={() => navigation.navigate('SearchFilter')} />
      <Text style={styles.locStatus}>{locStatus}</Text>
      {nearby.map((s) => (
        <TouchableOpacity key={s._id} activeOpacity={0.9} style={styles.nearRow} onPress={() => navigation.navigate('SchoolDetail', { schoolId: s._id })}>
          <IconTile name="school" color={C.blue} bg={C.blueSoft} box={40} size={20} round={10} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.featName} numberOfLines={1}>{s.name}</Text>
            <Text style={styles.featLoc} numberOfLines={1}>{s.location || [s.city, s.country].filter(Boolean).join(', ')}</Text>
            {s.verified ? <View style={{ marginTop: 4, alignSelf: 'flex-start' }}><StatusPill label="Verified" tone="green" /></View> : null}
          </View>
          {typeof s.distance === 'number' ? <Text style={styles.distance}>{s.distance < 10 ? s.distance.toFixed(1) : Math.round(s.distance)} km</Text> : null}
        </TouchableOpacity>
      ))}
      {loadingMore ? <ActivityIndicator style={{ marginVertical: 16 }} color={C.blue} /> : null}
      {!hasMore && nearby.length > 0 && !loadingMore ? <Text style={styles.endText}>You have reached the end of the list.</Text> : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  greet: { color: '#D6E5FF', fontSize: 13 },
  name: { color: '#fff', fontSize: 20, fontWeight: '800', marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, marginTop: 14 },
  tile: { width: '47%', margin: '1.5%', backgroundColor: '#fff', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: C.border, minHeight: 118, ...shadow },
  tileTitle: { fontSize: 13, fontWeight: '800', color: C.text, marginTop: 10 },
  tileSub: { fontSize: 11, color: C.muted, marginTop: 3, lineHeight: 15 },
  feat: { backgroundColor: '#fff', borderRadius: 16, marginHorizontal: 16, marginBottom: 14, overflow: 'hidden', borderWidth: 1, borderColor: C.border, ...shadow },
  featImg: { width: '100%', height: 150 },
  ph: { backgroundColor: '#DCE9FF', alignItems: 'center', justifyContent: 'center' },
  featBody: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  featName: { fontSize: 15, fontWeight: '800', color: C.text },
  featLoc: { fontSize: 12, color: C.muted, marginTop: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  ratingText: { fontSize: 12, fontWeight: '700', color: C.text, marginLeft: 4 },
  locStatus: { fontSize: 12, color: C.muted, marginHorizontal: 18, marginBottom: 8 },
  nearRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, marginHorizontal: 16, marginBottom: 10, padding: 12, borderWidth: 1, borderColor: C.border, ...shadow },
  endText: { textAlign: 'center', fontSize: 12, color: C.muted, marginVertical: 14 },
  distance: { fontSize: 12, fontWeight: '800', color: C.blue, marginLeft: 8 },
  stats: { flexDirection: "row", paddingHorizontal: 11, marginBottom: 12 },
  stat: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: C.border, marginHorizontal: 5 },
  statNum: { fontSize: 20, fontWeight: '900', color: C.text, marginTop: 4 },
  statLabel: { fontSize: 11, color: C.muted, marginTop: 2 },
});
