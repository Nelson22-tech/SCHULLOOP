// Explore tab: search & filter schools (board 4)
import { Ionicons } from '@expo/vector-icons';
import * as Localization from 'expo-localization';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import apiService from '../../shared/services/apiService';
import { BlueHeader, C, Btn, MAIN_BAR, ModuleBar, SearchField, StatusPill, shadow } from '../../shared/ui/kit';

const SAMPLE_SCHOOLS = [
  { _id: 'sample-1', name: 'Global University', location: 'New York, USA', rating: 4.8, reviewCount: 124, verified: true },
  { _id: 'sample-2', name: 'Tech Institute', location: 'San Francisco, USA', rating: 4.6, reviewCount: 98, verified: true },
  { _id: 'sample-3', name: 'Riverside College', location: 'London, UK', rating: 4.5, reviewCount: 76, verified: true },
];

const DEFAULT_FILTERS = {
  schoolType: [],
  country: '',
  city: '',
  priceRange: [0, 10000],
  rating: 0,
  keyword: '',
};

export const SearchFilterScreen = ({ navigation, route }) => {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [usingSample, setUsingSample] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [openMenu, setOpenMenu] = useState(null); // 'level' | 'location' | null
  const [showAdvanced, setShowAdvanced] = useState(false);
  const firstRun = useRef(true);

  const schoolTypes = ['Primary', 'Secondary', 'University', 'Private', 'Public'];
  // Countries/cities come from the schools actually in the database; the device's own country is pinned first.
  const [countries, setCountries] = useState([]);
  const [cities, setCities] = useState([]);
  const homeRegion = (() => { try { return Localization.getLocales?.()[0]?.regionCode || ''; } catch { return ''; } })();

  useEffect(() => {
    apiService.getSchoolLocations({ home: homeRegion }).then((d) => setCountries(d.countries || [])).catch(() => {});
  }, []);
  useEffect(() => {
    if (!filters.country) { setCities([]); return; }
    apiService.getSchoolLocations({ country: filters.country }).then((d) => setCities(d.cities || [])).catch(() => setCities([]));
  }, [filters.country]);

  const toggleSchoolType = (type) => {
    setFilters((prev) => ({
      ...prev,
      schoolType: prev.schoolType.includes(type)
        ? prev.schoolType.filter((t) => t !== type)
        : [...prev.schoolType, type],
    }));
  };

  const performSearch = async (override) => {
    const active = override || filters;
    setLoading(true);
    try {
      const query = {
        ...active,
        types: active.schoolType,
      };
      const data = await apiService.getSchools(query);
      const list = data.schools || [];
      setResults(list);
      setUsingSample(false);
      setSearched(true);
    } catch (error) {
      alert('Search failed: ' + error.message);
      if (!searched) {
        setResults(SAMPLE_SCHOOLS);
        setUsingSample(true);
        setSearched(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setResults([]);
    setSearched(false);
    performSearch(DEFAULT_FILTERS);
  };

  // Initial load + favourites
  useEffect(() => {
    performSearch();
    apiService.getFavorites()
      .then((d) => setFavoriteIds((d.schools || []).map((s) => s._id)))
      .catch(() => {});
  }, []);

  // Re-run when the level / location chips change
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    performSearch();
  }, [filters.schoolType, filters.country, filters.city]);

  const toggleFavorite = async (schoolId) => {
    if (String(schoolId).startsWith('sample-')) return;
    const isFav = favoriteIds.includes(schoolId);
    setFavoriteIds((prev) => (isFav ? prev.filter((id) => id !== schoolId) : [...prev, schoolId]));
    try {
      if (isFav) await apiService.removeFavorite(schoolId);
      else await apiService.addFavorite(schoolId);
    } catch (error) {
      setFavoriteIds((prev) => (isFav ? [...prev, schoolId] : prev.filter((id) => id !== schoolId)));
    }
  };

  const levelLabel = filters.schoolType.length === 0
    ? 'All Levels'
    : filters.schoolType.length === 1 ? filters.schoolType[0] : `${filters.schoolType.length} Levels`;
  const locationLabel = filters.city ? `${filters.city}, ${filters.country}` : filters.country || 'Location';
  const hasLocation = !!(filters.country || filters.city);

  return (
    <View style={styles.container}>
      <BlueHeader title="Explore" subtitle="Search & filter schools" onBack={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs', { screen: 'HomeTab' }))}>
        <SearchField
          value={filters.keyword}
          onChangeText={(text) => setFilters((prev) => ({ ...prev, keyword: text }))}
          onSubmitEditing={() => performSearch()}
          placeholder="Search schools..."
        />
        <View style={styles.chipRow}>
          <TouchableOpacity
            style={[styles.dropChip, filters.schoolType.length > 0 && styles.dropChipOn]}
            onPress={() => setOpenMenu(openMenu === 'level' ? null : 'level')}
          >
            <Text style={[styles.dropText, filters.schoolType.length > 0 && { color: '#fff' }]}>{levelLabel}</Text>
            <Ionicons name="chevron-down" size={14} color={filters.schoolType.length > 0 ? '#fff' : C.blue} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dropChip, hasLocation && styles.dropChipOn]}
            onPress={() => setOpenMenu(openMenu === 'location' ? null : 'location')}
          >
            <Ionicons name="location-outline" size={14} color={hasLocation ? '#fff' : C.blue} style={{ marginRight: 4 }} />
            <Text style={[styles.dropText, hasLocation && { color: '#fff' }]}>{locationLabel}</Text>
            <Ionicons name="chevron-down" size={14} color={hasLocation ? '#fff' : C.blue} />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            style={[styles.filterBtn, showAdvanced && { backgroundColor: C.blueSoft }]}
            onPress={() => setShowAdvanced((v) => !v)}
          >
            <Ionicons name="options-outline" size={20} color={C.blue} />
          </TouchableOpacity>
        </View>
      </BlueHeader>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {openMenu === 'level' ? (
          <View style={styles.menu}>
            {schoolTypes.map((type) => {
              const on = filters.schoolType.includes(type);
              return (
                <TouchableOpacity key={type} style={[styles.menuChip, on && styles.menuChipOn]} onPress={() => toggleSchoolType(type)}>
                  <Text style={[styles.menuText, on && { color: '#fff' }]}>{type}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}
        {openMenu === 'location' ? (
          <View style={styles.menu}>
            {countries.length === 0 ? <Text style={styles.menuHint}>No locations available yet.</Text> : null}
            {countries.map((c) => {
              const on = filters.country === c.name;
              return (
                <TouchableOpacity
                  key={c.name}
                  style={[styles.menuChip, on && styles.menuChipOn]}
                  onPress={() => setFilters((prev) => ({ ...prev, country: prev.country === c.name ? '' : c.name, city: '' }))}
                >
                  <Text style={[styles.menuText, on && { color: '#fff' }]}>{c.name}</Text>
                </TouchableOpacity>
              );
            })}
            {filters.country && cities.length > 0 ? (
              <View style={{ width: '100%', marginTop: 6 }}>
                <Text style={styles.menuHint}>Cities in {filters.country}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {cities.map((c) => {
                    const on = filters.city === c.name;
                    return (
                      <TouchableOpacity key={c.name} style={[styles.menuChip, on && styles.menuChipOn]} onPress={() => setFilters((prev) => ({ ...prev, city: prev.city === c.name ? '' : c.name }))}>
                        <Text style={[styles.menuText, on && { color: '#fff' }]}>{c.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        {showAdvanced ? (
          <View style={styles.panel}>
            <Text style={styles.panelLabel}>Max Annual Fees: ${filters.priceRange[1].toLocaleString()}</Text>
            <View style={styles.priceInput}>
              <TextInput
                style={styles.priceField}
                placeholder="Min"
                value={filters.priceRange[0].toString()}
                onChangeText={(text) => {
                  const num = parseInt(text) || 0;
                  setFilters((prev) => ({ ...prev, priceRange: [num, prev.priceRange[1]] }));
                }}
                keyboardType="numeric"
              />
              <Text style={styles.priceSeparator}>-</Text>
              <TextInput
                style={styles.priceField}
                placeholder="Max"
                value={filters.priceRange[1].toString()}
                onChangeText={(text) => {
                  const num = parseInt(text) || 10000;
                  setFilters((prev) => ({ ...prev, priceRange: [prev.priceRange[0], num] }));
                }}
                keyboardType="numeric"
              />
            </View>

            <Text style={[styles.panelLabel, { marginTop: 14 }]}>Minimum Rating: {filters.rating}★</Text>
            <View style={styles.ratingGrid}>
              {[0, 3, 3.5, 4, 4.5, 5].map((rating) => {
                const on = filters.rating === rating;
                return (
                  <TouchableOpacity
                    key={rating}
                    style={[styles.menuChip, on && styles.menuChipOn]}
                    onPress={() => setFilters((prev) => ({ ...prev, rating: prev.rating === rating ? 0 : rating }))}
                  >
                    <Text style={[styles.menuText, on && { color: '#fff' }]}>{rating === 0 ? 'Any' : `${rating}+`}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.actionButtons}>
              <Btn title="Clear Filters" variant="outline" onPress={clearFilters} style={{ flex: 1, marginRight: 10 }} />
              <Btn title="Search" onPress={() => performSearch()} style={{ flex: 1 }} />
            </View>
          </View>
        ) : null}

        {loading ? (
          <View style={{ paddingVertical: 40 }}><ActivityIndicator color={C.blue} /></View>
        ) : searched ? (
          <View style={{ paddingTop: 12 }}>
            <Text style={styles.resultsTitle}>
              {usingSample ? 'Sample schools' : `Found ${results.length} schools`}
            </Text>
            {results.length > 0 ? (
              results.map((item) => {
                const isFav = favoriteIds.includes(item._id);
                return (
                  <TouchableOpacity
                    key={item._id}
                    activeOpacity={0.9}
                    style={styles.card}
                    onPress={() => navigation.navigate('SchoolDetail', { schoolId: item._id })}
                  >
                    {item.imageUrl
                      ? <Image source={{ uri: item.imageUrl }} style={styles.thumb} resizeMode="cover" />
                      : <View style={[styles.thumb, styles.thumbPh]}><Ionicons name="school" size={30} color="#7FA9F0" /></View>}
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      {item.featured ? <StatusPill label="Featured" tone="blue" style={{ alignSelf: 'flex-start', marginBottom: 4 }} /> : null}
                      <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.loc} numberOfLines={1}>{item.location}</Text>
                      <View style={styles.metaRow}>
                        <Ionicons name="star" size={13} color={C.orange} />
                        <Text style={styles.rating}>
                          {item.rating || 'N/A'}{item.reviewCount ? ` (${item.reviewCount})` : ''}
                        </Text>
                        {item.verified ? <StatusPill label="Verified" tone="green" style={{ marginLeft: 8 }} /> : <StatusPill label="Unverified" tone="amber" style={{ marginLeft: 8 }} />}
                      </View>
                      {item.type ? <Text style={styles.type}>{item.type}</Text> : null}
                    </View>
                    <TouchableOpacity hitSlop={10} onPress={() => toggleFavorite(item._id)} style={styles.heart}>
                      <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={20} color={isFav ? C.red : C.muted} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })
            ) : (
              <Text style={styles.noResults}>No schools found matching your criteria</Text>
            )}
          </View>
        ) : null}
      </ScrollView>
      <ModuleBar items={MAIN_BAR} active="explore" navigation={navigation} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  chipRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  dropChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8 },
  dropChipOn: { backgroundColor: C.blueDark },
  dropText: { color: C.blue, fontWeight: '700', fontSize: 13, marginRight: 4 },
  filterBtn: { width: 40, height: 38, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  menu: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingTop: 12 },
  menuHint: { width: '100%', fontSize: 12, fontWeight: '700', color: C.muted, marginBottom: 8 },
  menuChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: C.blueSoft, marginRight: 8, marginBottom: 8 },
  menuChipOn: { backgroundColor: C.blue },
  menuText: { color: C.blue, fontWeight: '700', fontSize: 13 },
  panel: { backgroundColor: '#fff', borderRadius: 16, margin: 16, marginBottom: 4, padding: 16, borderWidth: 1, borderColor: C.border, ...shadow },
  panelLabel: { fontSize: 13, fontWeight: '800', color: C.text, marginBottom: 10 },
  priceInput: { flexDirection: 'row', alignItems: 'center' },
  priceField: { flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, height: 44, fontSize: 14, color: C.text },
  priceSeparator: { fontSize: 16, color: C.muted, marginHorizontal: 8 },
  ratingGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  actionButtons: { flexDirection: 'row', marginTop: 8 },
  resultsTitle: { fontSize: 14, fontWeight: '700', color: C.muted, marginLeft: 16, marginBottom: 10 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 10, marginHorizontal: 16, marginBottom: 12, borderWidth: 1, borderColor: C.border, ...shadow },
  thumb: { width: 76, height: 76, borderRadius: 12 },
  thumbPh: { backgroundColor: '#DCE9FF', alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 14, fontWeight: '800', color: C.text, paddingRight: 24 },
  loc: { fontSize: 12, color: C.muted, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  rating: { fontSize: 12, fontWeight: '700', color: C.text, marginLeft: 4 },
  type: { fontSize: 11, color: C.muted, marginTop: 4 },
  heart: { position: 'absolute', top: 10, right: 12 },
  noResults: { fontSize: 14, color: C.muted, textAlign: 'center', marginVertical: 32 },
});
