import { Ionicons } from '@expo/vector-icons';
import { useCallback, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BlueHeader, Btn, C, Initials, JOB_BAR, ModuleBar } from '../../shared/ui/kit';
import apiService from '../../shared/services/apiService';
import { AuthContext } from '../auth/AuthContext';
import { formatDate } from './jobHelpers';

const TABS = ['Chats', 'Groups'];

// Real conversations only: the other participant (or the school) names the row.
const describe = (conv, myId) => {
  const others = (conv.userIds || []).filter(u => String(u?._id || u?.id || u) !== String(myId));
  const person = others[0];
  const name = conv.schoolId?.name || person?.fullName || 'Conversation';
  const kind = conv.conversationType === 'school' ? 'School chat' : conv.conversationType === 'employer' ? 'Employer chat' : 'Direct message';
  return { name, kind };
};

export const JobMessagesScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [tab, setTab] = useState('Chats');
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    try {
      const res = await apiService.getConversations();
      setConversations(res?.conversations || []);
    } catch (e) { setConversations([]); }
    setLoading(false); setRefreshing(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { const unsub = navigation.addListener('focus', () => load(true)); return unsub; }, [navigation, load]);

  return (
    <View style={s.root}>
      <BlueHeader title="Messages" onBack={() => navigation.goBack()} />
      <View style={s.tabs}>
        {TABS.map(t => (
          <TouchableOpacity key={t} style={[s.tab, tab === t && s.tabOn]} onPress={() => setTab(t)}>
            <Text style={[s.tabText, tab === t && { color: C.blue }]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {loading ? <ActivityIndicator color={C.blue} style={{ marginTop: 30 }} /> : (
        <ScrollView style={{ flex: 1 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />} contentContainerStyle={{ paddingBottom: 20 }}>
          {tab === 'Chats' ? (
            conversations.length ? conversations.map(conv => {
              const { name, kind } = describe(conv, user?.id);
              return (
                <TouchableOpacity key={conv._id} style={s.row} onPress={() => navigation.navigate('Chat', { conversationId: conv._id, schoolId: conv.schoolId?._id })}>
                  <Initials name={name} size={46} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={s.name} numberOfLines={1}>{name}</Text>
                    <Text style={s.preview} numberOfLines={1}>{kind}</Text>
                  </View>
                  <Text style={s.time}>{formatDate(conv.updatedAt)}</Text>
                </TouchableOpacity>
              );
            }) : (
              <View style={s.empty}>
                <Ionicons name="chatbubbles-outline" size={40} color={C.blueLine} />
                <Text style={s.emptyText}>No conversations yet. Employers and schools you chat with will appear here.</Text>
              </View>
            )
          ) : (
            <View style={s.empty}>
              <Ionicons name="people-outline" size={40} color={C.blueLine} />
              <Text style={s.emptyText}>Groups you join will appear here.</Text>
              <Btn title="Browse Communities" variant="outline" style={{ marginTop: 14, paddingHorizontal: 20 }} onPress={() => navigation.navigate('Communities')} />
            </View>
          )}
        </ScrollView>
      )}
      <ModuleBar items={JOB_BAR} active="messages" navigation={navigation} />
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: C.border },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 14, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabOn: { borderBottomColor: C.blue },
  tabText: { fontSize: 14, fontWeight: '800', color: C.muted },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EDF2FA' },
  name: { fontSize: 14.5, fontWeight: '800', color: C.text },
  preview: { fontSize: 12.5, color: C.muted, marginTop: 3 },
  time: { fontSize: 11, color: C.muted, marginLeft: 8 },
  empty: { alignItems: 'center', marginTop: 50, paddingHorizontal: 30 },
  emptyText: { color: C.muted, marginTop: 8, textAlign: 'center' },
});
