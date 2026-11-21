import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BlueHeader, C, Card, IconTile, Initials, StatusPill } from '../../shared/ui/kit';
import apiService from '../../shared/services/apiService';

export const ManageAdminsScreen = ({ navigation }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiService.getAdminUsers();
      setUsers(data.users || []);
    } catch (error) {
      Alert.alert('Manage Admins', error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const changeRole = async (user, role) => {
    setActioningId(user.id);
    try {
      await apiService.setUserRole(user.id, role);
      await load();
    } catch (error) {
      Alert.alert('Manage Admins', error.message);
    } finally {
      setActioningId(null);
    }
  };

  const confirmDemote = (user) => {
    Alert.alert('Remove Admin Access', `Remove admin access from ${user.fullName}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => changeRole(user, 'parent') },
    ]);
  };

  const header = (
    <BlueHeader title="Manage Admins" subtitle="Promote or remove admin access" onBack={() => navigation.goBack()} />
  );

  if (loading && !users.length) {
    return (
      <View style={styles.container}>
        {header}
        <ActivityIndicator color={C.blue} style={{ marginTop: 40 }} />
      </View>
    );
  }

  const renderItem = ({ item }) => {
    const isSuper = item.userType === 'super_admin';
    const isAdmin = item.userType === 'admin';
    const busy = actioningId === item.id;
    return (
      <Card style={styles.card}>
        <View style={styles.rowTop}>
          <Initials name={item.fullName || item.email} size={42} bg={isSuper || isAdmin ? C.blue : C.muted} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.name} numberOfLines={1}>{item.fullName}</Text>
            <Text style={styles.email} numberOfLines={1}>{item.email}</Text>
          </View>
          <StatusPill label={isSuper ? 'Super Admin' : String(item.userType || 'user').replace(/_/g, ' ')} tone={isSuper || isAdmin ? 'green' : 'gray'} />
        </View>
        {isSuper ? (
          <Text style={styles.lockedNote}>Super admin roles can only be changed from the server, not here.</Text>
        ) : (
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={busy}
            onPress={() => (isAdmin ? confirmDemote(item) : changeRole(item, 'admin'))}
            style={[styles.action, isAdmin ? styles.actionOutline : styles.actionSolid, busy && { opacity: 0.6 }]}
          >
            {busy ? <ActivityIndicator size="small" color={isAdmin ? C.blue : '#fff'} /> : (
              <Text style={[styles.actionText, isAdmin && { color: C.blue }]}>{isAdmin ? 'Remove Admin Access' : 'Make Admin'}</Text>
            )}
          </TouchableOpacity>
        )}
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      {header}
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        onRefresh={load}
        refreshing={loading}
        renderItem={renderItem}
        ListEmptyComponent={(
          <View style={styles.empty}>
            <IconTile name="people" box={56} size={28} round={28} />
            <Text style={styles.emptyTitle}>No users yet</Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  list: { paddingTop: 16, paddingBottom: 24, flexGrow: 1 },
  card: {},
  rowTop: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: 15, fontWeight: '800', color: C.text },
  email: { color: C.muted, fontSize: 12, marginTop: 2 },
  lockedNote: { color: C.muted, fontStyle: 'italic', fontSize: 12, marginTop: 10 },
  action: { borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 12 },
  actionSolid: { backgroundColor: C.blue },
  actionOutline: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: C.blue },
  actionText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  empty: { alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, padding: 26, borderRadius: 16, borderWidth: 1, borderColor: C.border },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: C.text, marginTop: 12 },
});
