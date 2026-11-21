import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import apiService from '../../shared/services/apiService';
import { BlueHeader, Btn, C, Card, Initials, SearchField, SectionTitle, StatusPill } from '../../shared/ui/kit';
import { CATEGORY_ICONS, SAMPLE_SERVICES, SERVICE_CATEGORIES, notify } from './serviceHelpers';

// Eight tiles on the board: seven categories plus "More" (maps to Other).
const TILES = [...SERVICE_CATEGORIES.slice(0, 7), 'More'];

export const LocalServicesScreen = ({ navigation }) => {
  const [services, setServices] = useState([]);
  const [usingSample, setUsingSample] = useState(false);
  const [saved, setSaved] = useState([]);
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    try {
      const data = await apiService.request('/services');
      const list = (data.services || []).filter(x => x.status !== 'closed');
      if (list.length) { setServices(list); setUsingSample(false); }
      else { setServices(SAMPLE_SERVICES); setUsingSample(true); } // SAMPLE fallback
    } catch (e) { setServices(SAMPLE_SERVICES); setUsingSample(true); }
    try {
      const s = await apiService.request('/saved?itemType=service');
      setSaved((s.items || []).map(i => String(i.itemId)));
    } catch (e) { /* saved state is optional */ }
    setLoading(false); setRefreshing(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const c = city.trim().toLowerCase();
    return services.filter(x => {
      if (category && (x.category || 'Other') !== category) return false;
      if (c && !String(x.city || '').toLowerCase().includes(c)) return false;
      if (!q) return true;
      return [x.title, x.providerName, x.category, x.description].some(v => String(v || '').toLowerCase().includes(q));
    });
  }, [services, query, city, category]);

  const toggleSave = async item => {
    if (item.sample) { notify('Sample listing', 'Sample listings cannot be saved.'); return; }
    try {
      const r = await apiService.request('/saved/toggle', 'POST', { itemType: 'service', itemId: item._id });
      setSaved(prev => (r.saved ? [...prev, String(item._id)] : prev.filter(i => i !== String(item._id))));
    } catch (e) { notify('Save', e.message); }
  };

  const pickTile = tile => {
    const value = tile === 'More' ? 'Other' : tile;
    setCategory(prev => (prev === value ? '' : value));
  };

  return (
    <View style={s.root}>
      <BlueHeader title="Local Services" onBack={() => navigation.goBack()}>
        <SearchField value={query} onChangeText={setQuery} placeholder="Search services or providers..." />
      </BlueHeader>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />} contentContainerStyle={{ paddingBottom: 30 }}>
        <View style={s.grid}>
          {TILES.map(tile => {
            const value = tile === 'More' ? 'Other' : tile;
            const on = category === value;
            return (
              <TouchableOpacity key={tile} style={[s.tile, on && s.tileOn]} onPress={() => pickTile(tile)} activeOpacity={0.85}>
                <Ionicons name={CATEGORY_ICONS[value]} size={24} color={on ? '#fff' : C.blue} />
                <Text style={[s.tileText, on && { color: '#fff' }]} numberOfLines={1}>{tile}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={s.cityBox}>
          <Ionicons name="location-outline" size={18} color={C.muted} />
          <TextInput value={city} onChangeText={setCity} placeholder="Filter by city" placeholderTextColor="#8A97AE" style={s.cityInput} />
        </View>

        <SectionTitle title={category ? `${category} providers` : 'Providers'} action={category ? 'Clear filter' : undefined} onAction={() => setCategory('')} />
        {usingSample && !loading ? <Text style={s.sampleNote}>Sample listings shown - no live providers yet.</Text> : null}

        {loading ? <ActivityIndicator color={C.blue} style={{ marginTop: 30 }} /> : null}
        {!loading && !results.length ? (
          <View style={s.empty}><Ionicons name="construct-outline" size={40} color={C.blueLine} /><Text style={s.emptyText}>No providers match your search.</Text></View>
        ) : null}

        {results.map(item => {
          const isSaved = saved.includes(String(item._id));
          return (
            <Card key={item._id} onPress={() => navigation.navigate('ServiceDetail', { serviceId: item._id, service: item.sample ? item : undefined })}>
              <View style={s.row}>
                <Initials name={item.providerName || item.title} size={48} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={s.name} numberOfLines={1}>{item.providerName || 'Provider'}</Text>
                  <Text style={s.sub} numberOfLines={1}>{item.title}{item.category ? ` - ${item.category}` : ''}</Text>
                  <Text style={s.sub} numberOfLines={1}>{[item.area, item.city].filter(Boolean).join(', ')}</Text>
                  {item.availability ? <Text style={s.avail} numberOfLines={1}>Available: {item.availability}</Text> : null}
                </View>
                <TouchableOpacity onPress={() => toggleSave(item)} hitSlop={10}>
                  <Ionicons name={isSaved ? 'heart' : 'heart-outline'} size={22} color={isSaved ? C.red : C.muted} />
                </TouchableOpacity>
              </View>
              {item.sample ? <StatusPill label="Sample" tone="gray" style={{ marginTop: 8 }} /> : null}
            </Card>
          );
        })}

        <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
          <Btn title="Offer a service" icon="add-circle-outline" onPress={() => navigation.navigate('ServiceListingForm')} />
          <View style={{ flexDirection: 'row', marginTop: 10 }}>
            <Btn title="My Listings" variant="outline" style={{ flex: 1, marginRight: 6 }} onPress={() => navigation.navigate('MyListings')} />
            <Btn title="Requests" variant="outline" style={{ flex: 1, marginLeft: 6 }} onPress={() => navigation.navigate('ServiceRequests')} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingTop: 14 },
  tile: { width: '22%', marginHorizontal: '1.5%', marginBottom: 10, backgroundColor: C.blueSoft, borderRadius: 14, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  tileOn: { backgroundColor: C.blue },
  tileText: { fontSize: 10, fontWeight: '700', color: C.text, marginTop: 6 },
  cityBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: C.border, marginHorizontal: 16, marginBottom: 10, paddingHorizontal: 12, height: 42 },
  cityInput: { flex: 1, marginLeft: 8, fontSize: 14, color: C.text, paddingVertical: 0 },
  sampleNote: { color: C.muted, fontSize: 12, paddingHorizontal: 16, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: 15, fontWeight: '800', color: C.text },
  sub: { fontSize: 12, color: C.muted, marginTop: 2 },
  avail: { fontSize: 12, color: C.green, fontWeight: '600', marginTop: 2 },
  empty: { alignItems: 'center', marginTop: 24 },
  emptyText: { color: C.muted, marginTop: 8 },
});
