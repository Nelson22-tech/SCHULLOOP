// Student Connect 4 - Messages. Real data only: the user's conversations (chat API) and
// the groups they belong to. Empty state when there is nothing.
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlueHeader, C, CONNECT_BAR, ChipRow, Initials, ModuleBar, SearchField } from '../../shared/ui/kit';
import apiService from '../../shared/services/apiService';
import { AuthContext } from '../auth/AuthContext';
import { communityStyle, formatMembers, loadCommunities } from '../connect/CommunitiesScreen';

const FILTERS = ['All', 'Direct', 'Groups'];

const shortTime = (value) => {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return '';
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
  if (minutes < 10080) return `${Math.floor(minutes / 1440)}d`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const idOf = (value) => String(value?._id || value?.id || value || '');

export const MessagesScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true); else setLoading(true);
    const [convRes, groupRes] = await Promise.allSettled([apiService.getConversations(), loadCommunities()]);

    const direct = [];
    if (convRes.status === 'fulfilled') {
      const conversations = convRes.value.conversations || [];
      const built = await Promise.all(conversations.map(async (c) => {
        const other = (c.userIds || []).find(u => idOf(u) !== String(user?.id || ''));
        const school = c.schoolId && typeof c.schoolId === 'object' ? c.schoolId : null;
        const name = (other && other.fullName) || school?.name || 'Conversation';
        let last = null;
        try {
          const data = await apiService.getMessages(idOf(c));
          const list = data.messages || [];
          last = list[list.length - 1] || null;
        } catch (error) { /* no preview available */ }
        return {
          key: `c-${idOf(c)}`,
          kind: 'direct',
          name,
          preview: last ? last.text : 'No messages yet',
          time: last ? last.timestamp : c.updatedAt,
          params: { conversationId: idOf(c), schoolId: idOf(c.schoolId) || undefined, title: name },
        };
      }));
      direct.push(...built);
    }

    const groups = [];
    if (groupRes.status === 'fulfilled') {
      groupRes.value.filter(g => g.isMember || g.isAdmin).forEach((g, index) => {
        groups.push({
          key: `g-${g.id}`,
          kind: 'group',
          name: g.name,
          preview: formatMembers(g.memberCount),
          time: null,
          group: g,
          index,
        });
      });
    }

    setRows([...direct.sort((a, b) => new Date(b.time) - new Date(a.time)), ...groups]);
    setLoading(false); setRefreshing(false);
  }, [user?.id]);
  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => rows.filter(r => (filter === 'All' || (filter === 'Direct' ? r.kind === 'direct' : r.kind === 'group'))
    && (!query.trim() || r.name.toLowerCase().includes(query.trim().toLowerCase()))), [rows, filter, query]);

  const open = (row) => {
    if (row.kind === 'group') {
      const g = row.group;
      navigation.navigate('GroupChat', { group: g, groupId: g.id, groupName: g.name, groupType: g.type, isAdmin: g.isAdmin });
    } else {
      navigation.navigate('Chat', row.params);
    }
  };

  return (
    <View style={s.root}>
      <BlueHeader title="Messages" style={{ paddingBottom: 0 }} />
      <View style={s.searchWrap}>
        <SearchField value={query} onChangeText={setQuery} placeholder="Search messages..." style={s.search} />
      </View>
      <View style={{ backgroundColor: '#fff' }}><ChipRow items={FILTERS} value={filter} onChange={setFilter} /></View>
      {loading ? <ActivityIndicator color={C.blue} style={{ marginTop: 40 }} /> : (
        <ScrollView style={{ flex: 1, backgroundColor: '#fff' }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}>
          {visible.map(row => {
            const st = row.kind === 'group' ? communityStyle(row.group, row.index) : null;
            return (
              <TouchableOpacity key={row.key} style={s.row} activeOpacity={0.7} onPress={() => open(row)}>
                {st
                  ? <View style={[s.groupAvatar, { backgroundColor: st.color }]}><Ionicons name={st.icon} size={22} color="#fff" /></View>
                  : <Initials name={row.name} size={48} />}
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={s.name} numberOfLines={1}>{row.name}</Text>
                  <Text style={s.preview} numberOfLines={1}>{row.preview}</Text>
                </View>
                <Text style={s.time}>{shortTime(row.time)}</Text>
              </TouchableOpacity>
            );
          })}
          {!visible.length ? (
            <View style={s.empty}>
              <Ionicons name="chatbubbles-outline" size={54} color={C.blue} />
              <Text style={s.emptyTitle}>No messages yet</Text>
              <Text style={s.emptySub}>Message a school or join a community to start chatting.</Text>
            </View>
          ) : null}
        </ScrollView>
      )}
      <ModuleBar items={CONNECT_BAR} active="messages" navigation={navigation} />
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  searchWrap: { backgroundColor: C.blue, paddingBottom: 14 },
  search: { marginHorizontal: 16, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EDF2FA' },
  groupAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 15, fontWeight: '800', color: C.text },
  preview: { fontSize: 13, color: C.muted, marginTop: 3 },
  time: { fontSize: 12, color: C.muted, marginLeft: 8, alignSelf: 'flex-start', marginTop: 4 },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 30 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: C.text, marginTop: 12 },
  emptySub: { fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 6 },
});
