import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlueHeader, Btn, C, Initials, StatusPill, shadow } from '../../shared/ui/kit';
import apiService from '../../shared/services/apiService';

export const GroupDetailScreen = ({ route, navigation }) => {
  const { groupId, groupName, groupType, isAdmin } = route.params || {};
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [postText, setPostText] = useState('');
  const [posting, setPosting] = useState(false);

  const canPost = isAdmin || groupType !== 'announcements';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiService.getGroupPosts(groupId);
      setPosts(data.posts || []);
    } catch (error) {
      Alert.alert('Group', error.message);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    load();
  }, [load]);

  const submitPost = async () => {
    if (!postText.trim()) return;
    setPosting(true);
    try {
      await apiService.createGroupPost(groupId, postText.trim());
      setPostText('');
      await load();
    } catch (error) {
      Alert.alert('Group', error.message);
    } finally {
      setPosting(false);
    }
  };

  const confirmDeleteGroup = () => {
    Alert.alert('Delete Group', 'This removes the group and all of its posts. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await apiService.deleteGroup(groupId);
            navigation.goBack();
          } catch (error) {
            Alert.alert('Group', error.message);
          }
        },
      },
    ]);
  };

  if (loading && posts.length === 0) {
    return (
      <View style={styles.container}>
        <BlueHeader title={groupName} subtitle={groupType === 'announcements' ? 'Announcements' : 'Group'} onBack={() => navigation.goBack()} />
        <ActivityIndicator color={C.blue} style={{ marginTop: 40 }} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <BlueHeader title={groupName} subtitle={groupType === 'announcements' ? 'Announcements' : 'Group'} onBack={() => navigation.goBack()} />
      <FlatList
        data={posts}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        onRefresh={load}
        refreshing={loading}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="reader-outline" size={54} color={C.blue} />
            <Text style={styles.emptyTitle}>No posts yet</Text>
            <Text style={styles.emptySub}>{canPost ? 'Be the first to post here.' : 'Nothing has been posted yet.'}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.postItem}>
            <Initials name={item.author?.fullName || 'Someone'} size={38} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.postAuthor}>{item.author?.fullName || 'Someone'}</Text>
              <Text style={styles.postText}>{item.text}</Text>
            </View>
          </View>
        )}
        ListFooterComponent={isAdmin ? <Btn title="Delete Group" variant="outline" icon="trash-outline" onPress={confirmDeleteGroup} style={styles.deleteButton} /> : null}
      />
      {canPost ? (
        <View style={styles.composer}>
          <TextInput
            style={styles.composerInput}
            value={postText}
            onChangeText={setPostText}
            placeholder={groupType === 'announcements' ? 'Write an announcement...' : 'Write something...'}
            placeholderTextColor="#8A97AE"
            multiline
          />
          <TouchableOpacity
            style={[styles.send, (posting || !postText.trim()) && { opacity: 0.5 }]}
            onPress={submitPost}
            disabled={posting || !postText.trim()}
          >
            {posting ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={18} color="#fff" />}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.readOnlyNotice}>
          <StatusPill label="Read only" tone="gray" style={{ alignSelf: 'center', marginBottom: 6 }} />
          <Text style={styles.readOnlyText}>Only this group's admin can post announcements here.</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  list: { padding: 16, flexGrow: 1 },
  postItem: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: C.border, ...shadow },
  postAuthor: { fontWeight: '800', color: C.text, marginBottom: 4, fontSize: 14 },
  postText: { color: C.text, fontSize: 14, lineHeight: 20 },
  deleteButton: { marginTop: 8 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: C.text, marginTop: 12 },
  emptySub: { fontSize: 13, color: C.muted, marginTop: 4 },
  composer: { flexDirection: 'row', padding: 12, paddingBottom: Platform.OS === 'ios' ? 24 : 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: C.border, alignItems: 'flex-end' },
  composerInput: { flex: 1, backgroundColor: C.bg, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, minHeight: 42, maxHeight: 100, color: C.text, fontSize: 14 },
  send: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  readOnlyNotice: { padding: 14, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: C.border },
  readOnlyText: { color: C.muted, textAlign: 'center', fontSize: 13 },
});
