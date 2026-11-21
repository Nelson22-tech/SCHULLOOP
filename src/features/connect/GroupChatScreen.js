// Student Connect 5 - Group chat. Messages are the group's posts (group posts API), shown as
// chat bubbles. There is no group socket room, so new messages are picked up by polling.
// route.params: { group } or { groupId, groupName, groupType, isAdmin }.
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, k } from '../../shared/ui/kit';
import apiService from '../../shared/services/apiService';
import { AuthContext } from '../auth/AuthContext';
import { ChatBubble, ChatComposer, formatClock } from '../chat/ChatScreen';
import { communityStyle, formatMembers } from './CommunitiesScreen';

const POLL_MS = 8000;

export const GroupChatScreen = ({ route, navigation }) => {
  const params = route.params || {};
  const passed = params.group || {};
  const groupId = passed.id || params.groupId;
  const { user } = useContext(AuthContext);
  const [group, setGroup] = useState({
    ...passed,
    name: passed.name || params.groupName || 'Group',
    type: passed.type || params.groupType || 'class',
    isAdmin: passed.isAdmin ?? params.isAdmin ?? false,
  });
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  const canPost = group.isAdmin || group.type !== 'announcements';
  const st = communityStyle(group, 0);

  const load = useCallback(async (quiet = false) => {
    if (!groupId) { setLoading(false); return; }
    try {
      const data = await apiService.getGroupPosts(groupId);
      setMessages([...(data.posts || [])].reverse());
    } catch (error) {
      if (!quiet) Alert.alert('Group', error.message);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  // Fresh member count from the school's group list (same approach as CommunityDetail).
  useEffect(() => {
    if (!group.schoolId) return;
    apiService.getSchoolGroups(group.schoolId)
      .then(data => {
        const fresh = (data.groups || []).find(g => String(g.id) === String(groupId));
        if (fresh) setGroup(prev => ({ ...prev, ...fresh }));
      })
      .catch(() => {});
  }, [group.schoolId, groupId]);

  useEffect(() => {
    load();
    const timer = setInterval(() => load(true), POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  const send = async () => {
    if (!text.trim() || !groupId) return;
    setSending(true);
    try {
      const response = await apiService.createGroupPost(groupId, text.trim());
      const post = response.post;
      if (post) setMessages(prev => (prev.some(m => String(m.id) === String(post.id)) ? prev : [...prev, post]));
      else await load(true);
      setText('');
    } catch (error) {
      Alert.alert('Group', error.message);
    } finally {
      setSending(false);
    }
  };

  const memberLine = group.memberCount != null ? formatMembers(group.memberCount) : (group.type === 'announcements' ? 'Announcements' : 'Group');

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.root}>
      <View style={[k.header, s.header]}>
        <View style={s.headRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12} style={{ marginRight: 12 }}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={[s.avatar, { backgroundColor: st.color }]}><Ionicons name={st.icon} size={22} color="#fff" /></View>
          <TouchableOpacity style={{ flex: 1, marginLeft: 10 }} activeOpacity={0.8} onPress={() => groupId && navigation.navigate('CommunityDetail', { group, groupId })}>
            <Text style={s.title} numberOfLines={1}>{group.name}</Text>
            <Text style={s.sub}>{memberLine}</Text>
          </TouchableOpacity>
          <TouchableOpacity hitSlop={10} onPress={() => Alert.alert('Call', 'Group calls are not available yet.')}>
            <Ionicons name="call" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? <ActivityIndicator color={C.blue} style={{ marginTop: 40 }} /> : (
        <View style={{ flex: 1 }}>
          {messages.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name="chatbubbles-outline" size={56} color={C.blue} />
              <Text style={s.emptyTitle}>No messages yet</Text>
              <Text style={s.emptySub}>{canPost ? 'Say hello to the group!' : 'Nothing has been posted yet.'}</Text>
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={{ paddingVertical: 12 }}
              onContentSizeChange={() => listRef.current?.scrollToEnd?.({ animated: false })}
              renderItem={({ item }) => (
                <ChatBubble
                  own={!!item.author && String(item.author.id) === String(user?.id || '')}
                  sender={item.author?.fullName || 'Someone'}
                  text={item.text}
                  time={formatClock(item.createdAt)}
                />
              )}
            />
          )}
          {canPost ? (
            <ChatComposer
              value={text}
              onChangeText={setText}
              onSend={send}
              sending={sending}
              onAttach={() => Alert.alert('Attach', 'Attachments are not available yet.')}
              onEmoji={() => Alert.alert('Emoji', 'Use your keyboard emoji to add one.')}
            />
          ) : (
            <View style={s.readOnly}><Text style={s.readOnlyText}>Only this group's admin can post announcements here.</Text></View>
          )}
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { paddingBottom: 12 },
  headRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)' },
  title: { color: '#fff', fontSize: 16, fontWeight: '800' },
  sub: { color: '#D6E5FF', fontSize: 12, marginTop: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: C.text, marginTop: 12 },
  emptySub: { fontSize: 13, color: C.muted, marginTop: 4 },
  readOnly: { padding: 14, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: C.border },
  readOnlyText: { color: C.muted, fontStyle: 'italic', textAlign: 'center' },
});
