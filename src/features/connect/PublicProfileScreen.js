import { useCallback, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { BlueHeader, Btn, C, Card, Chip, Initials, StatusPill } from '../../shared/ui/kit';
import apiService from '../../shared/services/apiService';
import { AuthContext } from '../auth/AuthContext';

const CONNECT_LABELS = {
  self: null,
  none: 'Connect',
  pending_sent: 'Pending',
  pending_received: 'Respond to request',
  connected: 'Connected',
};

export const PublicProfileScreen = ({ route, navigation }) => {
  const { userId } = route.params || {};
  const { user: viewer } = useContext(AuthContext);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recommendationText, setRecommendationText] = useState('');
  const [sendingRecommendation, setSendingRecommendation] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await apiService.getUserProfile(userId);
      setData(result);
    } catch (error) {
      Alert.alert('Profile', error.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const isSelf = viewer && viewer.id === userId;

  const handleConnect = async () => {
    try {
      await apiService.sendConnectionRequest(userId);
      load();
    } catch (error) {
      Alert.alert('Connect', error.message);
    }
  };

  const toggleEndorsement = async (skill, alreadyEndorsed) => {
    try {
      if (alreadyEndorsed) {
        await apiService.removeEndorsement(userId, skill);
      } else {
        await apiService.endorseSkill(userId, skill);
      }
      load();
    } catch (error) {
      Alert.alert('Endorse', error.message);
    }
  };

  const submitRecommendation = async () => {
    if (!recommendationText.trim()) return;
    setSendingRecommendation(true);
    try {
      await apiService.sendRecommendation(userId, recommendationText.trim());
      setRecommendationText('');
      load();
    } catch (error) {
      Alert.alert('Recommendation', error.message);
    } finally {
      setSendingRecommendation(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <BlueHeader title="Profile" onBack={() => navigation.goBack()} />
        <ActivityIndicator color={C.blue} style={{ marginTop: 40 }} />
      </View>
    );
  }
  if (!data) return null;

  const { user, connectionCount, connectionStatus, endorsements, recommendations, posts } = data;
  const canConnect = connectionStatus === 'none';
  const isConnected = connectionStatus === 'connected';

  return (
    <View style={styles.container}>
      <BlueHeader title={user.fullName} subtitle={user.userType} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Card style={styles.headerCard}>
          <View style={styles.headerRow}>
            {user.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <Initials name={user.fullName || '?'} size={64} />
            )}
            <View style={styles.flex}>
              <Text style={styles.name}>{user.fullName}</Text>
              {user.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}
              <Text style={styles.connectionCount}>{connectionCount} connection{connectionCount === 1 ? '' : 's'}</Text>
            </View>
          </View>
          {!isSelf && canConnect ? <Btn title="Connect" icon="person-add" onPress={handleConnect} style={styles.connectButton} /> : null}
          {!isSelf && CONNECT_LABELS[connectionStatus] && !canConnect ? (
            <StatusPill label={CONNECT_LABELS[connectionStatus]} tone={isConnected ? 'green' : 'blue'} style={{ marginTop: 12 }} />
          ) : null}
        </Card>

        {user.experience?.length > 0 ? (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Experience</Text>
            {user.experience.map((item, index) => (
              <View key={index} style={styles.entry}>
                <Text style={styles.entryTitle}>{item.title}</Text>
                <Text style={styles.entrySubtitle}>{item.company}{item.location ? ` · ${item.location}` : ''}</Text>
                <Text style={styles.entryMeta}>
                  {item.startYear || '?'} - {item.current ? 'Present' : (item.endYear || '?')}
                </Text>
              </View>
            ))}
          </Card>
        ) : null}

        {(user.educationHistory?.length > 0) ? (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Education</Text>
            {user.educationHistory.map((item, index) => (
              <View key={index} style={styles.entry}>
                <Text style={styles.entryTitle}>{item.school}</Text>
                {item.degree ? <Text style={styles.entrySubtitle}>{item.degree}{item.fieldOfStudy ? `, ${item.fieldOfStudy}` : ''}</Text> : null}
                <Text style={styles.entryMeta}>{item.startYear || '?'} - {item.endYear || '?'}</Text>
              </View>
            ))}
          </Card>
        ) : null}

        {endorsements?.length > 0 ? (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Skills</Text>
            {endorsements.map((item) => (
              <View key={item.skill} style={styles.skillRow}>
                <View style={styles.flex}>
                  <Text style={styles.skillName}>{item.skill}</Text>
                  <Text style={styles.skillCount}>{item.count} endorsement{item.count === 1 ? '' : 's'}</Text>
                </View>
                {!isSelf && isConnected ? (
                  <Chip
                    label={item.endorsedByViewer ? 'Endorsed ✓' : 'Endorse'}
                    active={!item.endorsedByViewer}
                    style={{ marginRight: 0 }}
                    onPress={() => toggleEndorsement(item.skill, item.endorsedByViewer)}
                  />
                ) : null}
              </View>
            ))}
          </Card>
        ) : null}

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Recommendations</Text>
          {recommendations?.length > 0 ? (
            recommendations.map((rec) => (
              <View key={rec.id} style={styles.recommendation}>
                <Text style={styles.recommendationAuthor}>{rec.from?.fullName || 'A connection'}</Text>
                <Text style={styles.recommendationText}>{rec.text}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyHint}>No recommendations yet.</Text>
          )}
          {!isSelf && isConnected ? (
            <View style={styles.recommendationForm}>
              <TextInput
                style={styles.recommendationInput}
                value={recommendationText}
                onChangeText={setRecommendationText}
                placeholder={`Write a recommendation for ${user.fullName.split(' ')[0]}`}
                placeholderTextColor="#8A97AE"
                multiline
              />
              <Btn
                title={sendingRecommendation ? 'Sending...' : 'Send recommendation'}
                onPress={submitRecommendation}
                disabled={sendingRecommendation}
                style={{ paddingVertical: 11 }}
              />
            </View>
          ) : null}
        </Card>

        {posts?.length > 0 ? (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Recent posts</Text>
            {posts.map((post) => (
              <View key={post.id} style={styles.postItem}>
                <Text style={styles.postText}>{post.text}</Text>
              </View>
            ))}
          </Card>
        ) : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingTop: 16, paddingBottom: 32 },
  flex: { flex: 1, marginLeft: 14 },
  headerCard: { padding: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  avatarImage: { width: 64, height: 64, borderRadius: 32 },
  name: { fontSize: 19, fontWeight: '800', color: C.text },
  bio: { color: C.muted, marginTop: 4, fontSize: 13 },
  connectionCount: { color: C.blue, fontWeight: '700', marginTop: 6, fontSize: 13 },
  connectButton: { marginTop: 14 },
  section: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: C.text, marginBottom: 10 },
  entry: { marginBottom: 10 },
  entryTitle: { fontSize: 15, fontWeight: '700', color: C.text },
  entrySubtitle: { color: C.muted, marginTop: 2, fontSize: 13 },
  entryMeta: { color: '#8A97AE', fontSize: 12, marginTop: 2 },
  skillRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  skillName: { fontSize: 15, fontWeight: '700', color: C.text },
  skillCount: { color: C.muted, fontSize: 12, marginTop: 2 },
  emptyHint: { color: C.muted, fontStyle: 'italic' },
  recommendation: { borderLeftWidth: 3, borderLeftColor: C.blue, paddingLeft: 10, marginBottom: 10 },
  recommendationAuthor: { fontWeight: '800', color: C.text },
  recommendationText: { color: C.muted, marginTop: 2 },
  recommendationForm: { marginTop: 8 },
  recommendationInput: {
    borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 10, minHeight: 70, marginBottom: 10,
    textAlignVertical: 'top', color: C.text, backgroundColor: C.bg,
  },
  postItem: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#EDF2FA' },
  postText: { color: C.text },
});
