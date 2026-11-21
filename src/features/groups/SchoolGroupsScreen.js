import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlueHeader, Btn, C, StatusPill, shadow } from '../../shared/ui/kit';
import { communityStyle, formatMembers } from '../connect/CommunitiesScreen';
import apiService from '../../shared/services/apiService';

const TYPE_LABELS = {
  class: 'Class', club: 'Club', study: 'Study group', announcements: 'Announcements', alumni: 'Alumni',
};

export const SchoolGroupsScreen = ({ route, navigation }) => {
  const { schoolId, schoolName } = route.params || {};
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiService.getSchoolGroups(schoolId);
      setGroups(data.groups || []);
    } catch (error) {
      Alert.alert('Groups', error.message);
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleMembership = async (group) => {
    setActioningId(group.id);
    try {
      if (group.isMember) {
        await apiService.leaveGroup(group.id);
      } else {
        await apiService.joinGroup(group.id);
      }
      await load();
    } catch (error) {
      Alert.alert('Groups', error.message);
    } finally {
      setActioningId(null);
    }
  };

  const openGroup = (group) => {
    if (!group.isMember) {
      Alert.alert('Join to view', 'Join this group first to see its posts.');
      return;
    }
    navigation.navigate('GroupDetail', { groupId: group.id, groupName: group.name, groupType: group.type, isAdmin: group.isAdmin });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <BlueHeader title={schoolName || 'Groups'} subtitle="Classes, clubs, and study groups" onBack={() => navigation.goBack()} />
        <ActivityIndicator color={C.blue} style={{ marginTop: 40 }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BlueHeader title={schoolName || 'Groups'} subtitle="Classes, clubs, and study groups" onBack={() => navigation.goBack()} />
      <FlatList
        data={groups}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        onRefresh={load}
        refreshing={loading}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={54} color={C.blue} />
            <Text style={styles.emptyTitle}>No groups yet</Text>
            <Text style={styles.emptySub}>This school hasn't created any groups yet. Check back later.</Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const st = communityStyle(item, index);
          return (
            <TouchableOpacity activeOpacity={0.9} style={styles.card} onPress={() => openGroup(item)}>
              <View style={styles.top}>
                <View style={[styles.circle, { backgroundColor: st.color }]}><Ionicons name={st.icon} size={22} color="#fff" /></View>
                <View style={styles.flex}>
                  <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.memberCount}>{formatMembers(item.memberCount)}</Text>
                </View>
              </View>
              <View style={styles.badgeRow}>
                <StatusPill label={TYPE_LABELS[item.type] || item.type} tone="blue" />
                {item.isAdmin ? <StatusPill label="You manage this" tone="green" /> : null}
              </View>
              {item.description ? <Text style={styles.description}>{item.description}</Text> : null}
              <View style={styles.actions}>
                {item.isMember || item.isAdmin ? (
                  <Btn title="Open" style={[styles.flex, styles.btn]} onPress={() => openGroup(item)} />
                ) : null}
                {!item.isAdmin ? (
                  <Btn
                    title={item.isMember ? 'Leave' : 'Join'}
                    variant={item.isMember ? 'outline' : 'primary'}
                    style={[styles.flex, styles.btn]}
                    disabled={actioningId === item.id}
                    onPress={() => toggleMembership(item)}
                  />
                ) : null}
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  list: { padding: 16, flexGrow: 1 },
  flex: { flex: 1 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: C.border, ...shadow },
  top: { flexDirection: 'row', alignItems: 'center' },
  circle: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  name: { fontSize: 16, fontWeight: '800', color: C.text },
  memberCount: { color: C.muted, fontSize: 12, marginTop: 2 },
  badgeRow: { flexDirection: 'row', marginTop: 10, flexWrap: 'wrap', gap: 6 },
  description: { color: C.muted, fontSize: 13, marginTop: 10, lineHeight: 18 },
  actions: { flexDirection: 'row', marginTop: 12, gap: 8 },
  btn: { paddingVertical: 10 },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: C.text, marginTop: 12 },
  emptySub: { fontSize: 13, color: C.muted, marginTop: 4, textAlign: 'center' },
});
