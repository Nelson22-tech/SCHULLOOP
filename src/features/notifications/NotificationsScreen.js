import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../../shared/services/apiService';
import { C, WhiteHeader } from '../../shared/ui/kit';

// Visual style for each notification type (icon + circle colour), matching the board.
const typeStyle = (type = '') => {
  const t = String(type).toLowerCase();
  if (/pay|receipt|success|verified|approved|accepted/.test(t)) return { icon: 'checkmark', bg: C.green, title: /pay/.test(t) ? 'Payment Update' : 'Update' };
  if (/job|career|interview|opportunit/.test(t)) return { icon: 'briefcase', bg: C.red, title: 'New Job Opportunity' };
  if (/scholar|award|achiev/.test(t)) return { icon: 'trophy', bg: C.purple, title: 'Scholarship Alert' };
  if (/message|mail|chat/.test(t)) return { icon: 'mail', bg: '#3B82F6', title: 'Message Received' };
  if (/application|status|claim|school/.test(t)) return { icon: 'person', bg: C.blue, title: /application/.test(t) ? 'Application Status Update' : 'School Update' };
  return { icon: 'notifications', bg: C.blue, title: 'Notification' };
};

const timeAgo = (value) => {
  if (!value) return '';
  const diff = Date.now() - new Date(value).getTime();
  if (Number.isNaN(diff)) return '';
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(value).toLocaleDateString();
};

export const NotificationsScreen = ({ navigation }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiService.getNotifications();
      setNotifications(data.notifications || []);
      setError(null);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  const markRead = async (id) => {
    try {
      await apiService.markNotificationRead(id);
      setNotifications(previous => previous.map(item => item._id === id ? { ...item, read: true } : item));
    } catch (markError) { setError(markError.message); }
  };

  const back = navigation.canGoBack && navigation.canGoBack() ? () => navigation.goBack() : undefined;

  return (
    <View style={styles.container}>
      <WhiteHeader title="Notifications" onBack={back} />
      {error ? (
        <TouchableOpacity style={styles.error} onPress={loadNotifications}>
          <Text style={styles.errorText}>{error}  Tap to retry.</Text>
        </TouchableOpacity>
      ) : null}
      {loading && !notifications.length ? <ActivityIndicator color={C.blue} style={{ marginTop: 40 }} /> : null}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item._id}
        onRefresh={loadNotifications}
        refreshing={loading && notifications.length > 0}
        contentContainerStyle={styles.list}
        ListEmptyComponent={loading || error ? null : (
          <View style={styles.empty}>
            <View style={[styles.circle, { backgroundColor: C.blueSoft, width: 64, height: 64, borderRadius: 32 }]}>
              <Ionicons name="notifications-outline" size={28} color={C.blue} />
            </View>
            <Text style={styles.emptyTitle}>You're all caught up</Text>
            <Text style={styles.emptyText}>We'll let you know when something needs your attention.</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const st = typeStyle(item.type);
          return (
            <TouchableOpacity style={styles.row} activeOpacity={0.8} onPress={() => !item.read && markRead(item._id)}>
              <View style={[styles.circle, { backgroundColor: st.bg }]}>
                <Ionicons name={st.icon} size={22} color="#fff" />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={styles.title}>{st.title}</Text>
                <Text style={styles.body}>{item.message}</Text>
                <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
              </View>
              {!item.read ? <View style={styles.unread} /> : null}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  list: { paddingBottom: 24, flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#EDF2FA', backgroundColor: '#fff' },
  circle: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '800', color: C.text },
  body: { fontSize: 13, color: C.muted, marginTop: 3, lineHeight: 18 },
  time: { fontSize: 12, color: '#98A4BA', marginTop: 4 },
  unread: { width: 9, height: 9, borderRadius: 5, backgroundColor: C.blue, marginTop: 6, marginLeft: 8 },
  error: { backgroundColor: C.redSoft, padding: 12 },
  errorText: { color: C.red, fontSize: 13 },
  empty: { alignItems: 'center', paddingTop: 70, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: C.text, marginTop: 14 },
  emptyText: { fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 6 },
});
