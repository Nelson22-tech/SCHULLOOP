// Home Screen - Main School Discovery Screen
import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { FlatList, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ErrorMessage, LoadingSpinner } from '../../shared/components';
import { BlueHeader, Btn, C, SearchField, StatusPill, shadow } from '../../shared/ui/kit';
import apiService from '../../shared/services/apiService';
import { logError } from '../../shared/utils/logger';

export const HomeScreen = ({ navigation }) => {
  const [schools, setSchools] = useState([]);
  const [filteredSchools, setFilteredSchools] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [locationStatus, setLocationStatus] = useState('Finding schools near you...');

  const loadSchools = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiService.getSchools();
      const schoolList = data.schools || [];
      setSchools(schoolList);
      setFilteredSchools(schoolList);
      setError(null);
    } catch (err) {
      setError(err.message);
      logError('Error loading schools:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadNearbySchools = useCallback(async () => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') { setLocationStatus('Location permission unavailable; showing all schools'); return loadSchools(); }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLoading(true);
      const data = await apiService.getNearbySchools(position.coords.latitude, position.coords.longitude);
      let schoolList=data.schools||[]; let status='Schools near your location';
      if(!schoolList.length){const all=await apiService.getSchools();schoolList=all.schools||[];status='No schools with a known location yet; showing all schools';}
      else if(typeof schoolList[0].distance==='number'&&schoolList[0].distance>50)status=`Nearest school is about ${Math.round(schoolList[0].distance)} km away - search to find schools anywhere`;
      setSchools(schoolList);setFilteredSchools(schoolList);setLocationStatus(status);setError(null);
    } catch(err){setLocationStatus('Unable to find nearby schools');logError('Error loading nearby schools:',err);loadSchools();} finally{setLoading(false);}
  }, [loadSchools]);

  useEffect(() => {
    loadNearbySchools();
  }, [loadNearbySchools]);

  const searchTimer = useRef(null);
  useEffect(() => () => clearTimeout(searchTimer.current), []);

  // Search is global (name, city, region, country...) and debounced so we don't hit the API on every keystroke.
  const handleSearch = (text) => {
    setSearchText(text);
    clearTimeout(searchTimer.current);
    if (!text.trim()) {
      setFilteredSchools(schools);
      setError(null);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      try {
        const data = await apiService.getSchools({ keyword: text.trim() });
        setFilteredSchools(data.schools || []);
        setError(null);
      } catch (err) {
        setError(err.message);
        logError('Error searching schools:', err);
      }
    }, 400);
  };

  if (loading) {
    return <LoadingSpinner message="Loading schools..." />;
  }

  return (
    <View style={styles.container}>
      <BlueHeader title="Find your next school" subtitle="Global School Finder">
        <SearchField
          value={searchText}
          onChangeText={handleSearch}
          placeholder="Search by school or city"
          onFilter={() => navigation.navigate('SearchFilter')}
        />
      </BlueHeader>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.locationStatusWrap}><Text style={styles.locationStatus}>{locationStatus}</Text></View>

        {/* Error Message */}
        {error && (
          <ErrorMessage
            message={error}
            onRetry={loadSchools}
            dismissable
            onDismiss={() => setError(null)}
          />
        )}

        {/* Schools List */}
        {filteredSchools.length > 0 ? (
          <FlatList
            data={filteredSchools}
            keyExtractor={(item) => item._id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View style={styles.card}>
                {item.imageUrl
                  ? <Image source={{ uri: item.imageUrl }} style={styles.cardImage} resizeMode="cover" />
                  : <View style={[styles.cardImage, styles.cardImagePh]}><Ionicons name="school" size={48} color="#7FA9F0" /></View>}
                <View style={styles.schoolCardContent}>
                  <View style={styles.headerRow}>
                    <View style={styles.schoolInfo}>
                      <Text style={styles.schoolName}>{item.name}</Text>
                      <Text style={styles.schoolLocation}>{item.location}</Text>
                    </View>
                    {item.rating && (
                      <Text style={styles.rating}>★ {item.rating}</Text>
                    )}
                  </View>

                  <View style={styles.badgeContainer}>
                    {item.type ? <StatusPill label={item.type} tone="blue" /> : null}
                    {item.verified ? (
                      <StatusPill label="Verified" tone="green" />
                    ) : (
                      <StatusPill label="Unverified" tone="amber" />
                    )}
                    {typeof item.distance === 'number' && (
                      <StatusPill label={`${item.distance.toFixed(1)} km`} tone="gray" />
                    )}
                  </View>

                  <Text style={styles.description} numberOfLines={2}>
                    {item.locked
                      ? 'Full profile (fees, admissions, photos, reviews) unlocks once this school is verified.'
                      : item.description || 'Quality education for a better future'}
                  </Text>

                  <View style={styles.actionRow}>
                    <Btn
                      title={item.locked ? 'View' : 'Explore'}
                      onPress={() =>
                        navigation.navigate('SchoolDetail', { schoolId: item._id })
                      }
                      style={styles.viewButton}
                    />
                    {!item.locked && (
                      <Btn
                        title="Contact"
                        variant="outline"
                        onPress={() =>
                          navigation.navigate('Chat', { schoolId: item._id })
                        }
                        style={styles.chatButton}
                      />
                    )}
                  </View>
                </View>
              </View>
            )}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>○</Text>
            <Text style={styles.emptyText}>
              {searchText ? 'No schools found' : 'No schools available'}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchText ? 'Try different search terms' : 'Check back soon!'}
            </Text>
          </View>
        )}

        {/* Featured Section */}
        {!searchText && filteredSchools.length > 0 && (
          <View style={styles.featuredSection}>
            <Text style={styles.sectionTitle}>Continue exploring</Text>
            <View style={styles.actionGrid}>
              <Btn
                title="More filters"
                onPress={() => navigation.navigate('SearchFilter')}
                style={styles.actionButton}
              />
              <Btn
                title="Saved schools"
                variant="outline"
                onPress={() => navigation.navigate('Favorites')}
                style={styles.actionButton}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  card: { backgroundColor: '#fff', borderRadius: 16, marginHorizontal: 16, marginBottom: 14, overflow: 'hidden', borderWidth: 1, borderColor: C.border, ...shadow },
  cardImage: { width: '100%', height: 150 },
  cardImagePh: { backgroundColor: '#DCE9FF', alignItems: 'center', justifyContent: 'center' },
  schoolCardContent: {
    padding: 16,
  },
  locationStatusWrap: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 2,
  },
  locationStatus: {
    color: '#64748B',
    fontSize: 12.5,
    fontWeight: '500',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 9,
  },
  schoolInfo: {
    flex: 1,
  },
  schoolName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#102A56',
    marginBottom: 4,
  },
  schoolLocation: {
    fontSize: 13,
    color: '#64748B',
  },
  rating: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#D97706',
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  description: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 12,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  viewButton: {
    flex: 1,
    marginRight: 8,
    paddingVertical: 11,
  },
  chatButton: {
    flex: 1,
    paddingVertical: 11,
  },
  emptyContainer: {
    paddingVertical: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#102A56',
  },
  emptySubtext: {
    fontSize: 13,
    color: '#9AA5A9',
    marginTop: 4,
  },
  featuredSection: {
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#102A56',
    marginBottom: 12,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 11,
  },
});
