import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';
import apiService from '../../shared/services/apiService';
import { BlueHeader, Btn, C, Card, StatusPill } from '../../shared/ui/kit';
import { confirmAction, notify } from './serviceHelpers';

export const MyListingsScreen = ({ navigation }) => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    try {
      const data = await apiService.request('/services/mine');
      setListings(data.listings || []); setError('');
    } catch (e) { setError(e.message || 'Could not load your listings.'); }
    setLoading(false); setRefreshing(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => navigation.addListener('focus', () => load(true)), [navigation, load]);

  const close = item => confirmAction('Close listing', `Close "${item.title}"?`, async () => {
    try { await apiService.request(`/services/${item._id}`, 'DELETE'); load(true); }
    catch (e) { notify('Close listing', e.message); }
  }, 'Close listing');

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <BlueHeader title="My Listings" onBack={() => navigation.goBack()} />
      {loading ? <ActivityIndicator color={C.blue} style={{ marginTop: 40 }} /> : (
        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />} contentContainerStyle={{ paddingTop: 14, paddingBottom: 40 }}>
          {error ? <Text style={{ color: C.red, paddingHorizontal: 16, marginBottom: 10 }}>{error}</Text> : null}
          {!listings.length && !error ? (
            <View style={{ alignItems: 'center', marginTop: 50, paddingHorizontal: 24 }}>
              <Ionicons name="construct-outline" size={44} color={C.blueLine} />
              <Text style={{ color: C.muted, marginVertical: 10 }}>You have no service listings yet.</Text>
              <Btn title="Create listing" icon="add-circle-outline" style={{ paddingHorizontal: 28 }} onPress={() => navigation.navigate('ServiceListingForm')} />
            </View>
          ) : null}
          {listings.map(item => {
            const closed = item.status === 'closed';
            return (
              <Card key={item._id} onPress={() => navigation.navigate('ServiceDetail', { serviceId: item._id })}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ flex: 1, fontSize: 15, fontWeight: '800', color: C.text, marginRight: 8 }} numberOfLines={1}>{item.title}</Text>
                  <StatusPill label={closed ? 'Closed' : 'Active'} tone={closed ? 'gray' : 'green'} />
                </View>
                <Text style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>{[item.category, item.area, item.city].filter(Boolean).join(' - ')}</Text>
                <View style={{ flexDirection: 'row', marginTop: 10 }}>
                  <Btn title="Edit" variant="outline" style={{ flex: 1, marginRight: 6, paddingVertical: 10 }} onPress={() => navigation.navigate('ServiceListingForm', { service: item })} />
                  {!closed ? <Btn title="Close" variant="outline" style={{ flex: 1, marginLeft: 6, paddingVertical: 10 }} onPress={() => close(item)} /> : null}
                </View>
              </Card>
            );
          })}
          {listings.length ? <View style={{ paddingHorizontal: 16 }}><Btn title="Create listing" icon="add-circle-outline" onPress={() => navigation.navigate('ServiceListingForm')} /></View> : null}
        </ScrollView>
      )}
    </View>
  );
};
