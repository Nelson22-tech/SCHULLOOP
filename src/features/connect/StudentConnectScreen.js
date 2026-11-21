// Student Connect 1 - home. Blue header + hero + quick tiles + popular communities, with the
// existing network features (feed, people search, connections, requests) kept below.
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { ActivityIndicator, Alert, Image, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  C, CONNECT_BAR, BlueHeader, Btn, Card, ChipRow, IconBtn, IconTile, Initials, ModuleBar, SectionTitle, StatusPill, shadow,
} from '../../shared/ui/kit';
import apiService from '../../shared/services/apiService';
import { AuthContext } from '../auth/AuthContext';
import { SAMPLE_COMMUNITIES, communityStyle, formatMembers, loadCommunities } from './CommunitiesScreen';

const timeAgo = (date) => {
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
};

const Avatar = ({ name, uri, size = 40 }) => (uri
  ? <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
  : <Initials name={name || '?'} size={size} />);

const SECTIONS = ['Feed', 'Explore', 'Network', 'Groups'];

export const StudentConnectScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [section, setSection] = useState('Feed');
  const [feed, setFeed] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [connections, setConnections] = useState([]);
  const [requests, setRequests] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [composer, setComposer] = useState('');
  const [media, setMedia] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [posting, setPosting] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [mentorOnly, setMentorOnly] = useState(false);
  const scrollRef = useRef(null);
  const composerRef = useRef(null);
  const networkY = useRef(0);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true); else setRefreshing(true);
    try {
      const [feedRes, suggestRes, connectionRes, requestRes] = await Promise.all([
        apiService.getFeed(30), apiService.getConnectSuggestions(12), apiService.getConnections(), apiService.getConnectionRequests(),
      ]);
      setFeed(feedRes.posts || []);
      setSuggestions(suggestRes.users || []);
      setConnections(connectionRes.users || []);
      setRequests(requestRes.requests || []);
    } catch (error) { Alert.alert('Student Connect', error.message); }
    finally { setLoading(false); setRefreshing(false); }
    try { setCommunities(await loadCommunities(4)); } catch (error) { setCommunities([]); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const incoming = requests.filter(r => r.status === 'pending' && r.toUserId?._id === user?.id);
  const isMentor = (x) => ['graduate', 'employer'].includes(x.userType) || /mentor|expert|professional/i.test(`${x.bio || ''} ${(x.skills || []).join(' ')}`);
  const filteredSuggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = mentorOnly ? suggestions.filter(isMentor) : suggestions;
    if (!q) return list;
    return list.filter(x => `${x.fullName} ${x.bio || ''} ${(x.skills || []).join(' ')}`.toLowerCase().includes(q));
  }, [suggestions, search, mentorOnly]);

  const pickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], allowsMultipleSelection: true, selectionLimit: 8, quality: 0.8 });
    if (!result.canceled) setMedia(result.assets || []);
  };

  const post = async () => {
    if (!composer.trim() && !media.length) return;
    setPosting(true);
    try {
      const uploaded = [];
      for (const item of media) uploaded.push(await apiService.uploadFile(item.uri, item.fileName || `post-${Date.now()}`, item.mimeType || 'image/jpeg'));
      await apiService.createPost(composer.trim(), uploaded.map(x => x.url), uploaded.map(x => x.mimeType), 'connections');
      setComposer(''); setMedia([]); await load(true);
    } catch (error) { Alert.alert('Post', error.message); } finally { setPosting(false); }
  };

  const connect = async (id) => {
    try { await apiService.sendConnectionRequest(id); Alert.alert('Connect', 'Connection request sent.'); await load(true); }
    catch (error) { Alert.alert('Connect', error.message); }
  };

  const respond = async (id, status) => {
    try { await apiService.updateConnectionRequest(id, status); await load(true); }
    catch (error) { Alert.alert('Connect', error.message); }
  };

  const joinCommunity = async (group) => {
    if (group.sample) { Alert.alert('Communities', 'Sample community. Real communities appear once schools create groups.'); return; }
    setBusyId(group.id);
    try {
      if (group.isMember) await apiService.leaveGroup(group.id); else await apiService.joinGroup(group.id);
      await load(true);
    } catch (error) { Alert.alert('Communities', error.message); } finally { setBusyId(null); }
  };

  const openStudyGroups = () => {
    const withSchool = communities.find(g => g.schoolId);
    if (withSchool) navigation.navigate('SchoolGroups', { schoolId: withSchool.schoolId, schoolName: withSchool.schoolName });
    else navigation.navigate('Communities');
  };

  // The tiles sit at the top while the sections they control are further down the page, so scroll there.
  const scrollToNetwork = () => setTimeout(() => scrollRef.current?.scrollTo({ y: Math.max(0, networkY.current - 8), animated: true }), 60);
  const openAsk = () => {
    setMentorOnly(false);
    setSection('Feed');
    setComposer(c => c || 'Question: ');
    scrollToNetwork();
    setTimeout(() => composerRef.current?.focus?.(), 450);
  };
  const openMentors = () => navigation.navigate('Mentors');
  const openEvents = () => navigation.navigate('Events');

  const tiles = [
    { key: 'groups', icon: 'people', title: 'Study Groups', sub: 'Find study groups', onPress: openStudyGroups },
    { key: 'ask', icon: 'help-circle', title: 'Ask Questions', sub: 'Get help from peers', onPress: openAsk },
    { key: 'events', icon: 'calendar', title: 'Events', sub: 'Join upcoming events', onPress: openEvents },
    { key: 'mentor', icon: 'school', title: 'Mentorship', sub: 'Learn from experts', onPress: openMentors },
  ];

  const popularSource = communities.length ? communities : SAMPLE_COMMUNITIES;
  const popular = popularSource.slice(0, 3);
  const usingSample = communities.length === 0;
  const avatarUri = user?.avatarUrl;

  return (
    <View style={s.root}>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
      >
        <BlueHeader
          brand
          style={{ paddingBottom: 20 }}
          right={<>
            <IconBtn name="notifications-outline" onPress={() => navigation.navigate('Notifications')} />
            <TouchableOpacity style={{ marginLeft: 14 }} onPress={() => navigation.navigate('StudentProfile')}>
              <View style={s.avatarRing}><Avatar name={user?.fullName} uri={avatarUri} size={34} /></View>
            </TouchableOpacity>
          </>}
        >
          <View style={s.hero}>
            <View style={s.heroTitleRow}>
              <Ionicons name="people" size={20} color="#fff" />
              <Text style={s.heroTitle}>Student Connect</Text>
            </View>
            <Text style={s.heroTag}>Meet  •  Learn  •  Grow</Text>
            <Text style={s.heroCopy}>Join a global community of students, share ideas, ask questions and build your future together.</Text>
            <TouchableOpacity style={s.heroBtn} activeOpacity={0.85} onPress={() => navigation.navigate('Communities')}>
              <Text style={s.heroBtnText}>Join Community</Text>
            </TouchableOpacity>
          </View>
        </BlueHeader>

        <View style={s.tileGrid}>
          {tiles.map(t => (
            <TouchableOpacity key={t.key} activeOpacity={0.85} style={s.tile} onPress={t.onPress}>
              <IconTile name={t.icon} box={38} size={20} round={19} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={s.tileTitle} numberOfLines={1}>{t.title}</Text>
                <Text style={s.tileSub} numberOfLines={1}>{t.sub}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.popularCard}>
          <SectionTitle title="Popular Communities" action="View All" onAction={() => navigation.navigate('Communities')} style={{ paddingHorizontal: 0 }} />
          {usingSample ? <Text style={s.note}>Sample communities - real ones appear when schools create groups.</Text> : null}
          {popular.map((g, i) => {
            const st = communityStyle(g, i);
            return (
              <TouchableOpacity key={g.id} activeOpacity={0.85} style={[s.communityRow, i === popular.length - 1 && { borderBottomWidth: 0 }]} onPress={() => navigation.navigate('CommunityDetail', { group: g })}>
                <View style={[s.circle, { backgroundColor: st.color }]}><Ionicons name={st.icon} size={20} color="#fff" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.cName} numberOfLines={1}>{g.name}</Text>
                  <Text style={s.cSub}>{formatMembers(g.memberCount)}</Text>
                </View>
                {g.isAdmin ? <Text style={s.manage}>Manager</Text> : (
                  <TouchableOpacity disabled={busyId === g.id} onPress={() => joinCommunity(g)} style={[s.join, g.isMember && s.joined]}>
                    <Text style={[s.joinText, g.isMember && { color: C.blue }]}>{g.isMember ? 'Joined' : 'Join'}</Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <View onLayout={(e) => { networkY.current = e.nativeEvent.layout.y; }}>
          <SectionTitle title="Your network" style={{ marginTop: 18 }} />
        </View>
        <ChipRow items={SECTIONS} value={section} onChange={(v) => { setSection(v); if (v !== 'Explore') setMentorOnly(false); }} style={{ marginTop: -10 }} />

        {loading ? <ActivityIndicator color={C.blue} style={{ marginTop: 24 }} /> : null}

        {!loading && section === 'Feed' ? (
          <View>
            <Card>
              <View style={s.rowCenter}>
                <Avatar name={user?.fullName} uri={avatarUri} size={44} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={s.cName}>Welcome back, {user?.fullName?.split(' ')[0] || 'Student'}</Text>
                  <Text style={s.cSub}>Share progress, discover people and build your network.</Text>
                </View>
              </View>
              <TextInput ref={composerRef} value={composer} onChangeText={setComposer} placeholder="What is happening in your student life?" placeholderTextColor="#8A97AE" multiline style={s.composer} />
              <View style={[s.rowCenter, { marginTop: 10, justifyContent: 'space-between' }]}>
                <TouchableOpacity style={s.rowCenter} onPress={pickMedia}>
                  <Ionicons name="image-outline" size={20} color={C.blue} />
                  <Text style={s.mediaText}>{media.length ? `${media.length} file(s) selected` : 'Photo / Video'}</Text>
                </TouchableOpacity>
                <Text style={s.cSub}>{composer.length}/2000</Text>
              </View>
              <Btn title={posting ? 'Posting...' : 'Post'} onPress={post} disabled={!composer.trim() && !media.length || posting} style={{ marginTop: 12, paddingVertical: 11 }} />
            </Card>

            {incoming.length > 0 ? (
              <Card>
                <Text style={s.cardTitle}>Connection requests</Text>
                {incoming.slice(0, 3).map(r => (
                  <View key={r._id} style={[s.rowCenter, { paddingVertical: 8 }]}>
                    <Avatar name={r.fromUserId?.fullName} uri={r.fromUserId?.avatarUrl} size={40} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={s.cName}>{r.fromUserId?.fullName || 'Student'}</Text>
                      <Text style={s.cSub}>wants to connect with you</Text>
                    </View>
                    <TouchableOpacity style={s.join} onPress={() => respond(r._id, 'accepted')}><Text style={s.joinText}>Accept</Text></TouchableOpacity>
                  </View>
                ))}
              </Card>
            ) : null}

            {feed.map(item => (
              <Card key={String(item.id)}>
                <View style={s.rowCenter}>
                  <Avatar name={item.author?.fullName} uri={item.author?.avatarUrl} size={40} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={s.cName}>{item.author?.fullName || 'Student'}</Text>
                    <Text style={s.cSub}>{item.author?.userType || 'Student'} · {timeAgo(item.createdAt)}</Text>
                  </View>
                </View>
                <Text style={s.postText}>{item.text}</Text>
                {item.mediaUrls?.length ? (
                  <View style={s.mediaWrap}>{item.mediaUrls.map((uri, i) => <Image key={uri + i} source={{ uri }} style={s.postImage} />)}</View>
                ) : null}
                <View style={s.postFooter}>
                  <StatusPill label="Network post" tone="blue" />
                  <TouchableOpacity onPress={() => navigation.navigate('PublicProfile', { userId: item.author?.id })}>
                    <Text style={s.link}>View profile</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ))}
            {!feed.length ? (
              <View style={s.empty}><Ionicons name="newspaper-outline" size={36} color={C.muted} /><Text style={s.emptyTitle}>Your feed is empty</Text><Text style={s.cSub}>Connect with students and share your first update.</Text></View>
            ) : null}
          </View>
        ) : null}

        {!loading && section === 'Explore' ? (
          <View>
            <View style={s.searchBox}>
              <Ionicons name="search" size={18} color={C.muted} />
              <TextInput value={search} onChangeText={setSearch} placeholder="Search students by name, skills or interests" placeholderTextColor="#8A97AE" style={s.searchInput} />
            </View>
            <SectionTitle title={mentorOnly ? 'Mentors & experts' : 'People you may know'} action={mentorOnly ? 'Show everyone' : undefined} onAction={() => setMentorOnly(false)} />
            {filteredSuggestions.map(item => (
              <Card key={item.id}>
                <View style={s.rowCenter}>
                  <Avatar name={item.fullName} uri={item.avatarUrl} size={48} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={s.cName}>{item.fullName}</Text>
                    <Text style={s.cSub}>{item.userType}</Text>
                    {item.sharesSchool ? <StatusPill label="Same verified school" tone="green" style={{ marginTop: 5 }} /> : null}
                  </View>
                </View>
                <Text style={s.bio}>{item.bio || 'Open to connecting with students worldwide.'}</Text>
                {item.skills?.length ? <Text style={s.skills}>{item.skills.slice(0, 5).join(' · ')}</Text> : null}
                <View style={[s.rowCenter, { marginTop: 12 }]}>
                  <Btn title="Connect" onPress={() => connect(item.id)} style={{ flex: 1, paddingVertical: 10, marginRight: 8 }} />
                  <Btn title="View profile" variant="outline" onPress={() => navigation.navigate('PublicProfile', { userId: item.id })} style={{ flex: 1, paddingVertical: 10 }} />
                </View>
              </Card>
            ))}
            {!filteredSuggestions.length ? (
              <View style={s.empty}><Ionicons name="search-outline" size={36} color={C.muted} /><Text style={s.emptyTitle}>{mentorOnly ? 'No mentors yet' : 'No students found'}</Text><Text style={s.cSub}>{mentorOnly ? 'Graduates and professionals who join SchulLoop will appear here.' : 'Try another name or skill.'}</Text></View>
            ) : null}
          </View>
        ) : null}

        {!loading && section === 'Network' ? (
          <View>
            <Card style={{ alignItems: 'center', paddingVertical: 20 }}>
              <Text style={s.bigNumber}>{connections.length}</Text>
              <Text style={s.cSub}>connections</Text>
              <Text style={s.networkCopy}>Build meaningful relationships with students and graduates from different schools and countries.</Text>
            </Card>
            <SectionTitle title="My connections" />
            {connections.map(item => (
              <Card key={item.id} onPress={() => navigation.navigate('PublicProfile', { userId: item.id })}>
                <View style={s.rowCenter}>
                  <Avatar name={item.fullName} uri={item.avatarUrl} size={40} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={s.cName}>{item.fullName}</Text>
                    <Text style={s.cSub}>{item.userType}{item.skills?.length ? ` · ${item.skills.slice(0, 3).join(' · ')}` : ''}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={C.muted} />
                </View>
              </Card>
            ))}
            {!connections.length ? (
              <View style={s.empty}><Ionicons name="people-outline" size={36} color={C.muted} /><Text style={s.emptyTitle}>No connections yet</Text><Text style={s.cSub}>Explore students and send your first connection request.</Text></View>
            ) : null}
          </View>
        ) : null}

        {!loading && section === 'Groups' ? (
          <View>
            <Card>
              <Text style={s.cardTitle}>School Communities</Text>
              <Text style={s.cSub}>Join classes, clubs, study groups and alumni communities from verified schools.</Text>
              <Btn title="Open a School" onPress={() => navigation.navigate('HomeTab')} style={{ marginTop: 12, alignSelf: 'flex-start', paddingHorizontal: 22, paddingVertical: 10 }} />
            </Card>
            <SectionTitle title="How it works" />
            {['Find a verified school', 'Open its community groups', 'Join a class, club or study group', 'Participate in posts and announcements'].map((x, i) => (
              <View key={x} style={s.step}>
                <View style={s.stepNumber}><Text style={s.stepNumberText}>{i + 1}</Text></View>
                <Text style={s.stepText}>{x}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
      <ModuleBar items={CONNECT_BAR} active="connect" navigation={navigation} />
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  avatarRing: { borderWidth: 2, borderColor: '#fff', borderRadius: 20 },
  hero: { backgroundColor: C.blueDark, borderRadius: 16, padding: 16, marginTop: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  heroTitleRow: { flexDirection: 'row', alignItems: 'center' },
  heroTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginLeft: 8 },
  heroTag: { color: '#fff', fontSize: 13, fontWeight: '700', marginTop: 12 },
  heroCopy: { color: '#D6E5FF', fontSize: 12, lineHeight: 18, marginTop: 8 },
  heroBtn: { alignSelf: 'center', borderWidth: 1.5, borderColor: '#fff', borderRadius: 10, paddingHorizontal: 28, paddingVertical: 9, marginTop: 16 },
  heroBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, marginTop: 14 },
  tile: { width: '47%', marginHorizontal: '1.5%', marginBottom: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: C.border, ...shadow },
  tileTitle: { fontSize: 13, fontWeight: '800', color: C.text },
  tileSub: { fontSize: 10.5, color: C.muted, marginTop: 2 },
  popularCard: { backgroundColor: '#fff', borderRadius: 16, marginHorizontal: 16, marginTop: 6, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4, borderWidth: 1, borderColor: C.border, ...shadow },
  note: { color: C.muted, fontSize: 11, marginBottom: 6 },
  communityRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#EDF2FA' },
  circle: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  cName: { fontSize: 14, fontWeight: '800', color: C.text },
  cSub: { fontSize: 12, color: C.muted, marginTop: 2 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: C.text, marginBottom: 6 },
  join: { backgroundColor: C.blue, paddingHorizontal: 18, paddingVertical: 7, borderRadius: 10, borderWidth: 1.5, borderColor: C.blue },
  joined: { backgroundColor: '#fff' },
  joinText: { color: '#fff', fontWeight: '800', fontSize: 12.5 },
  manage: { color: C.green, fontWeight: '800', fontSize: 12 },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  composer: { minHeight: 76, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, marginTop: 14, color: C.text, backgroundColor: C.bg, fontSize: 14, textAlignVertical: 'top' },
  mediaText: { color: C.blue, fontWeight: '700', fontSize: 13, marginLeft: 6 },
  postText: { fontSize: 14.5, color: C.text, lineHeight: 21, marginTop: 12 },
  mediaWrap: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },
  postImage: { width: 150, height: 110, borderRadius: 12, marginRight: 8, marginBottom: 8 },
  postFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#EDF2FA' },
  link: { color: C.blue, fontWeight: '700', fontSize: 13 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: C.border, paddingHorizontal: 12, height: 46, marginHorizontal: 16, marginBottom: 6 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: C.text, paddingVertical: 0 },
  bio: { color: C.muted, marginTop: 10, lineHeight: 19, fontSize: 13 },
  skills: { color: C.blue, fontWeight: '700', marginTop: 8, fontSize: 12.5 },
  bigNumber: { fontSize: 38, fontWeight: '800', color: C.blue },
  networkCopy: { textAlign: 'center', color: C.text, lineHeight: 20, marginTop: 10, fontSize: 13 },
  step: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, marginHorizontal: 16 },
  stepNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  stepNumberText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  stepText: { flex: 1, color: C.text, fontWeight: '600', fontSize: 14 },
  empty: { alignItems: 'center', paddingVertical: 30, paddingHorizontal: 30 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: C.text, marginTop: 8 },
});
