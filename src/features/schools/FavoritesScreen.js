import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ErrorMessage, LoadingSpinner } from '../../shared/components';
import apiService from '../../shared/services/apiService';
import { BlueHeader, C, StatusPill, shadow } from '../../shared/ui/kit';

export const FavoritesScreen = ({ navigation }) => {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadFavorites = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiService.getFavorites();
      setSchools(data.schools || []);
      setError(null);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const removeFavorite = async (schoolId) => {
    await apiService.removeFavorite(schoolId);
    setSchools((previous) => previous.filter((school) => school._id !== schoolId));
  };

  if (loading) return <LoadingSpinner message="Loading favorites..." />;

  return (
    <View style={styles.container}>
      <BlueHeader title="My Favorites" onBack={() => navigation.goBack()} />
      {error ? <ErrorMessage message={error} onRetry={loadFavorites} /> : null}
      {schools.length === 0 && !error ? (
        <View style={styles.empty}>
          <Ionicons name="heart-outline" size={48} color={C.muted} />
          <Text style={styles.title}>No favorites yet</Text>
          <Text style={styles.subtitle}>Save schools from their detail pages to find them here.</Text>
        </View>
      ) : (
        <FlatList
          data={schools}
          keyExtractor={(school) => school._id}
          contentContainerStyle={{ paddingTop: 14, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.card}
              onPress={() => navigation.navigate('SchoolDetail', { schoolId: item._id })}
            >
              {item.imageUrl
                ? <Image source={{ uri: item.imageUrl }} style={styles.thumb} resizeMode="cover" />
                : <View style={[styles.thumb, styles.thumbPh]}><Ionicons name="school" size={30} color="#7FA9F0" /></View>}
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.schoolName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.location} numberOfLines={1}>{item.location}</Text>
                <View style={styles.metaRow}>
                  <Ionicons name="star" size={13} color={C.orange} />
                  <Text style={styles.rating}>{item.rating}</Text>
                  {item.verified ? <StatusPill label="Verified" tone="green" style={{ marginLeft: 8 }} /> : null}
                </View>
              </View>
              <TouchableOpacity hitSlop={10} onPress={() => removeFavorite(item._id)} accessibilityLabel="Remove" style={styles.heart}>
                <Ionicons name="heart" size={20} color={C.red} />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 10, marginHorizontal: 16, marginBottom: 12, borderWidth: 1, borderColor: C.border, ...shadow },
  thumb: { width: 76, height: 76, borderRadius: 12 },
  thumbPh: { backgroundColor: '#DCE9FF', alignItems: 'center', justifyContent: 'center' },
  schoolName: { fontSize: 14, fontWeight: '800', color: C.text, paddingRight: 24 },
  location: { fontSize: 12, color: C.muted, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  rating: { fontSize: 12, fontWeight: '700', color: C.text, marginLeft: 4 },
  heart: { position: 'absolute', top: 10, right: 12 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 20, fontWeight: '700', marginTop: 12, color: C.text },
  subtitle: { color: C.muted, textAlign: 'center', marginTop: 8 },
});
