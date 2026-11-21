// Student Connect 3 - Community details. Reuses the group posts API (GroupDetailScreen logic).
// route.params: { group } (from Communities) or { groupId, groupName, groupType, isAdmin }.
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, CONNECT_BAR, Btn, Card, Initials, ModuleBar, StatusPill, shadow, topPad } from '../../shared/ui/kit';
import apiService from '../../shared/services/apiService';
import { communityStyle, formatMembers } from './CommunitiesScreen';

const TABS = ['Posts', 'Members', 'About'];
const TYPE_LABELS = { class: 'Class', club: 'Club', study: 'Study group', announcements: 'Announcements', alumni: 'Alumni' };

const timeAgo = (date) => {
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
};

export const CommunityDetailScreen = ({ route, navigation }) => {
  const params = route.params || {};
  const passed = params.group || {};
  const groupId = passed.id || params.groupId;
  const [group, setGroup] = useState({
    ...passed,
    id: groupId,
    name: passed.name || params.groupName || 'Community',
    type: passed.type || params.groupType || 'class',
    isAdmin: passed.isAdmin ?? params.isAdmin ?? false,
  });
  const isSample = !!passed.sample || !groupId;
  const [tab, setTab] = useState('Posts');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(!isSample);
  const [postText, setPostText] = useState('');
  const [posting, setPosting] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  const canPost = group.isAdmin || group.type !== 'announcements';
  const style = communityStyle(group, 0);

  const loadPosts = useCallback(async () => {
    if (isSample) { setLoading(false); return; }
    setLoading(true);
    try {
      const data = await apiService.getGroupPosts(groupId);
      setPosts(data.posts || []);
    } catch (error) {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [groupId, isSample]);

  // Refreshes membership / member count from the school's group list.
  const refreshGroup = useCallback(async () => {
    if (isSample || !group.schoolId) return;
    try {
      const data = await apiService.getSchoolGroups(group.schoolId);
      const fresh = (data.groups || []).find(g => String(g.id) === String(groupId));
      if (fresh) setGroup(prev => ({ ...prev, ...fresh }));
    } catch (error) { /* keep what we have */ }
  }, [group.schoolId, groupId, isSample]);

  useEffect(() => { loadPosts(); refreshGroup(); }, [loadPosts, refreshGroup]);

  const toggleJoin = async () => {
    if (isSample) { Alert.alert('Community', 'Sample community. Real communities appear once schools create groups.'); return; }
    setBusy(true);
    try {
      if (group.isMember) await apiService.leaveGroup(groupId); else await apiService.joinGroup(groupId);
      setGroup(prev => ({ ...prev, isMember: !prev.isMember }));
      await Promise.all([refreshGroup(), loadPosts()]);
    } catch (error) { Alert.alert('Community', error.message); } finally { setBusy(false); }
  };

  const submitPost = async () => {
    if (!postText.trim()) return;
    setPosting(true);
    try {
      await apiService.createGroupPost(groupId, postText.trim());
      setPostText('');
      await loadPosts();
    } catch (error) { Alert.alert('Community', error.message); } finally { setPosting(false); }
  };

  const confirmDeleteGroup = () => {
    Alert.alert('Delete Group', 'This removes the group and all of its posts. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try { await apiService.deleteGroup(groupId); navigation.goBack(); } catch (error) { Alert.alert('Group', error.message); }
        },
      },
    ]);
  };

  const quick = (label) => {
    if (label === 'Question') { setPostText(t => (t.startsWith('Question: ') ? t : `Question: ${t}`)); inputRef.current?.focus(); return; }
    Alert.alert(label, `${label} posts are not available yet. You can share text in this community.`);
  };

  return (
    <View style={s.root}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 90 }} showsVerticalScrollIndicator={false}>
        <View style={s.banner}>
          <Ionicons name="school" size={70} color="rgba(255,255,255,0.35)" />
          <TouchableOpacity style={s.back} onPress={() => navigation.goBack()} hitSlop={10}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={s.sheet}>
          <View style={[s.avatar, { backgroundColor: style.color }]}><Ionicons name={style.icon} size={34} color="#fff" /></View>
          <Text style={s.name}>{group.name}</Text>
          <Text style={s.meta}>{formatMembers(group.memberCount).replace(/ members?$/, '')} members  •  {group.isMember || group.isAdmin ? 'Joined' : 'Public'}</Text>
          <Text style={s.desc}>{group.description || `A community for ${group.name} students to share experiences, ask questions and make new friends.`}</Text>
          {group.isAdmin ? <StatusPill label="You manage this community" tone="green" style={{ marginBottom: 10 }} /> : (
            <Btn
              title={group.isMember ? 'Leave Community' : 'Join Community'}
              variant={group.isMember ? 'outline' : 'primary'}
              onPress={toggleJoin}
              disabled={busy}
            />
          )}
        </View>

        <View style={s.tabs}>
          {TABS.map(t => (
            <TouchableOpacity key={t} style={[s.tab, tab === t && s.tabOn]} onPress={() => setTab(t)}>
              <Text style={[s.tabText, tab === t && { color: C.blue, fontWeight: '800' }]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'Posts' ? (
          <View style={{ paddingTop: 14 }}>
            {canPost ? (
              <Card>
                <View style={s.composeRow}>
                  <Initials name="Me" size={36} />
                  <TextInput
                    ref={inputRef}
                    style={s.composeInput}
                    value={postText}
                    onChangeText={setPostText}
                    placeholder={group.type === 'announcements' ? 'Write an announcement...' : 'Share something...'}
                    placeholderTextColor="#8A97AE"
                    multiline
                    editable={!isSample && (group.isMember || group.isAdmin)}
                  />
                </View>
                <View style={s.composeActions}>
                  {[['image-outline', 'Photo'], ['help-circle-outline', 'Question'], ['stats-chart-outline', 'Poll']].map(([icon, label]) => (
                    <TouchableOpacity key={label} style={s.quick} onPress={() => quick(label)}>
                      <Ionicons name={icon} size={16} color={C.blue} /><Text style={s.quickText}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                  {postText.trim() ? (
                    <TouchableOpacity style={s.postBtn} disabled={posting} onPress={submitPost}>
                      <Text style={s.postBtnText}>{posting ? '...' : 'Post'}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </Card>
            ) : (
              <Text style={s.readOnly}>Only this group's admin can post announcements here.</Text>
            )}

            {loading ? <ActivityIndicator color={C.blue} style={{ marginTop: 20 }} /> : null}
            {!loading && posts.map(p => (
              <Card key={p.id}>
                <View style={s.postHead}>
                  <Initials name={p.author?.fullName || 'Someone'} size={38} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={s.author}>{p.author?.fullName || 'Someone'}</Text>
                    <Text style={s.time}>{timeAgo(p.createdAt)}</Text>
                  </View>
                  <Ionicons name="ellipsis-horizontal" size={18} color={C.muted} />
                </View>
                <Text style={s.postText}>{p.text}</Text>
                <View style={s.postFoot}>
                  <View style={s.footItem}><Ionicons name="thumbs-up-outline" size={17} color={C.muted} /><Text style={s.footText}>Like</Text></View>
                  <View style={s.footItem}><Ionicons name="chatbubble-outline" size={17} color={C.muted} /><Text style={s.footText}>Comment</Text></View>
                </View>
              </Card>
            ))}
            {!loading && !posts.length ? (
              <View style={s.empty}>
                <Ionicons name="chatbubbles-outline" size={36} color={C.muted} />
                <Text style={s.emptyTitle}>No posts yet</Text>
                <Text style={s.time}>
                  {isSample ? 'This is a sample community.' : !group.isMember && !group.isAdmin ? 'Join this community to see and share posts.' : canPost ? 'Be the first to post here.' : 'Nothing has been posted yet.'}
                </Text>
              </View>
            ) : null}
            {group.isAdmin ? <Btn title="Delete Group" variant="outline" onPress={confirmDeleteGroup} style={{ marginHorizontal: 16 }} /> : null}
          </View>
        ) : null}

        {tab === 'Members' ? (
          <Card style={{ marginTop: 14, alignItems: 'center', paddingVertical: 24 }}>
            <Ionicons name="people" size={34} color={C.blue} />
            <Text style={s.bigNumber}>{Number(group.memberCount) || 0}</Text>
            <Text style={s.time}>members in this community</Text>
          </Card>
        ) : null}

        {tab === 'About' ? (
          <Card style={{ marginTop: 14 }}>
            <Text style={s.author}>About this community</Text>
            <Text style={[s.desc, { textAlign: 'left', marginTop: 8 }]}>{group.description || 'No description yet.'}</Text>
            <Text style={s.aboutRow}>Type: <Text style={s.aboutVal}>{TYPE_LABELS[group.type] || group.type}</Text></Text>
            {group.schoolName ? <Text style={s.aboutRow}>School: <Text style={s.aboutVal}>{group.schoolName}</Text></Text> : null}
            <Text style={s.aboutRow}>Visibility: <Text style={s.aboutVal}>Public</Text></Text>
          </Card>
        ) : null}
      </ScrollView>

      {tab === 'Posts' && canPost && !isSample && (group.isMember || group.isAdmin) ? (
        <TouchableOpacity style={s.fab} activeOpacity={0.85} onPress={() => inputRef.current?.focus()}>
          <Ionicons name="pencil" size={22} color="#fff" />
        </TouchableOpacity>
      ) : null}
      <ModuleBar items={CONNECT_BAR} active="connect" navigation={navigation} />
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  banner: { height: 150 + topPad / 2, backgroundColor: C.blueDeep, alignItems: 'center', justifyContent: 'center' },
  back: { position: 'absolute', left: 16, top: topPad - 4, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -24, paddingHorizontal: 16, paddingBottom: 12 },
  avatar: { width: 76, height: 76, borderRadius: 38, marginTop: -38, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: '#fff', ...shadow },
  name: { fontSize: 22, fontWeight: '800', color: C.text, marginTop: 8 },
  meta: { fontSize: 12.5, color: C.muted, marginTop: 4 },
  desc: { fontSize: 13, color: C.text, lineHeight: 19, marginVertical: 12 },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: C.border },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabOn: { borderBottomColor: C.blue },
  tabText: { color: C.muted, fontWeight: '600', fontSize: 14 },
  composeRow: { flexDirection: 'row', alignItems: 'center' },
  composeInput: { flex: 1, marginLeft: 10, minHeight: 40, maxHeight: 100, color: C.text, fontSize: 14, backgroundColor: C.bg, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  composeActions: { flexDirection: 'row', alignItems: 'center', marginTop: 12, borderTopWidth: 1, borderTopColor: '#EDF2FA', paddingTop: 10 },
  quick: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'center' },
  quickText: { color: C.text, fontSize: 12.5, fontWeight: '600', marginLeft: 5 },
  postBtn: { backgroundColor: C.blue, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 7 },
  postBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  readOnly: { color: C.muted, fontStyle: 'italic', textAlign: 'center', marginBottom: 12, paddingHorizontal: 16 },
  postHead: { flexDirection: 'row', alignItems: 'center' },
  author: { fontSize: 14.5, fontWeight: '800', color: C.text },
  time: { fontSize: 12, color: C.muted, marginTop: 1 },
  postText: { fontSize: 14, color: C.text, lineHeight: 20, marginTop: 10 },
  postFoot: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#EDF2FA' },
  footItem: { flexDirection: 'row', alignItems: 'center' },
  footText: { color: C.muted, fontSize: 13, marginLeft: 6, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 30, paddingHorizontal: 30 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: C.text, marginTop: 8 },
  bigNumber: { fontSize: 34, fontWeight: '800', color: C.blue, marginTop: 6 },
  aboutRow: { color: C.muted, fontSize: 13, marginTop: 10 },
  aboutVal: { color: C.text, fontWeight: '700' },
  fab: { position: 'absolute', right: 18, bottom: 84, width: 54, height: 54, borderRadius: 27, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center', ...shadow, shadowOpacity: 0.3 },
});
