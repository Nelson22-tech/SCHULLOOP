import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import apiService from '../../shared/services/apiService';
import { BlueHeader, Btn, C, Card, Field, Initials, SectionTitle, StatusPill } from '../../shared/ui/kit';
import { confirmAction, notify, quoteText, requestLabel, requestTone } from './serviceHelpers';

const Detail = ({ icon, label, value }) => (value ? (
  <View style={s.detailRow}>
    <Ionicons name={icon} size={18} color={C.blue} style={{ width: 28 }} />
    <View style={{ flex: 1 }}><Text style={s.detailLabel}>{label}</Text><Text style={s.detailValue}>{value}</Text></View>
  </View>
) : null);

export const ServiceDetailScreen = ({ navigation, route }) => {
  const serviceId = route?.params?.serviceId;
  const passed = route?.params?.service;
  const [service, setService] = useState(passed || null);
  const [isOwner, setIsOwner] = useState(false);
  const [myRequest, setMyRequest] = useState(null);
  const [incoming, setIncoming] = useState([]);
  const [loading, setLoading] = useState(!passed);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [date, setDate] = useState('');
  const [contact, setContact] = useState('');
  const [busy, setBusy] = useState(false);

  const isSample = !!(service && service.sample);

  const load = useCallback(async (quiet = false) => {
    if (passed && passed.sample) return; // sample listing: nothing to fetch
    if (quiet) setRefreshing(true);
    try {
      const data = await apiService.request(`/services/${serviceId}`);
      setService(data.service); setIsOwner(!!data.isOwner); setMyRequest(data.myRequest || null); setError('');
      if (data.isOwner) {
        try {
          const inc = await apiService.request('/services/requests/incoming');
          setIncoming((inc.requests || []).filter(r => String(r.serviceId) === String(serviceId)));
        } catch (e) { setIncoming([]); }
      }
    } catch (e) { if (!passed) setError(e.message || 'Could not load this listing.'); }
    setLoading(false); setRefreshing(false);
  }, [serviceId, passed]);
  useEffect(() => { load(); }, [load]);

  const sendRequest = async () => {
    if (isSample) { notify('Sample listing', 'This is a sample listing. Requests are disabled.'); return; }
    if (!message.trim()) { notify('Request service', 'Please describe what you need.'); return; }
    setBusy(true);
    try {
      const body = { message: message.trim(), preferredDate: date.trim() };
      if (contact.trim()) body.contactInfo = contact.trim();
      const r = await apiService.request(`/services/${serviceId}/requests`, 'POST', body);
      setMyRequest(r.request); setMessage(''); setDate(''); setContact('');
      notify('Request sent', 'The provider has been notified.');
    } catch (e) { notify('Request service', e.message); }
    setBusy(false);
  };

  const closeListing = () => confirmAction('Close listing', 'Customers will no longer be able to find or request this service.', async () => {
    try { await apiService.request(`/services/${serviceId}`, 'DELETE'); navigation.goBack(); }
    catch (e) { notify('Close listing', e.message); }
  }, 'Close listing');

  const updateRequest = (req, status, label) => confirmAction(label, `Mark this request as ${requestLabel(status).toLowerCase()}?`, async () => {
    try { await apiService.request(`/service-requests/${req._id}`, 'PUT', { status }); load(true); }
    catch (e) { notify(label, e.message); }
  });

  if (loading) return <View style={s.root}><BlueHeader title="Service" onBack={() => navigation.goBack()} /><ActivityIndicator color={C.blue} style={{ marginTop: 40 }} /></View>;
  if (!service) {
    return (
      <View style={s.root}>
        <BlueHeader title="Service" onBack={() => navigation.goBack()} />
        <View style={s.center}><Text style={s.muted}>{error || 'Listing not found.'}</Text><Btn title="Try again" variant="outline" style={{ marginTop: 14, paddingHorizontal: 24 }} onPress={() => { setLoading(true); load(); }} /></View>
      </View>
    );
  }

  const closed = service.status === 'closed';
  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <BlueHeader title="Service Details" onBack={() => navigation.goBack()} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: 14, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}>
        <Card>
          <View style={s.row}>
            <Initials name={service.providerName || service.title} size={52} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.title}>{service.title}</Text>
              <Text style={s.muted}>{service.providerName || 'Provider'}</Text>
            </View>
          </View>
          <View style={[s.row, { marginTop: 10 }]}>
            {service.category ? <StatusPill label={service.category} tone="blue" style={{ marginRight: 6 }} /> : null}
            <StatusPill label={closed ? 'Closed' : 'Active'} tone={closed ? 'gray' : 'green'} />
            {isSample ? <StatusPill label="Sample" tone="gray" style={{ marginLeft: 6 }} /> : null}
          </View>
          {service.description ? <Text style={s.desc}>{service.description}</Text> : null}
        </Card>

        <Card>
          <Detail icon="location-outline" label="Area" value={[service.area, service.city].filter(Boolean).join(', ')} />
          <Detail icon="pricetag-outline" label="Pricing / quotation approach" value={service.pricing} />
          <Detail icon="time-outline" label="Availability" value={service.availability} />
          <Detail icon="chatbubble-ellipses-outline" label="Contact method" value={service.contactMethod} />
        </Card>

        {isOwner ? (
          <>
            <View style={s.actions}>
              <Btn title="Edit" icon="create-outline" variant="outline" style={{ flex: 1, marginRight: 6 }} onPress={() => navigation.navigate('ServiceListingForm', { service })} />
              {!closed ? <Btn title="Close listing" icon="close-circle-outline" variant="outline" style={{ flex: 1, marginLeft: 6 }} onPress={closeListing} /> : null}
            </View>
            <SectionTitle title={`Incoming requests (${incoming.length})`} style={{ marginTop: 14 }} />
            {!incoming.length ? <Text style={[s.muted, { paddingHorizontal: 16 }]}>No requests for this listing yet.</Text> : null}
            {incoming.map(r => (
              <Card key={r._id}>
                <View style={s.rowBetween}>
                  <Text style={s.name}>{r.customerName || 'Customer'}</Text>
                  <StatusPill label={requestLabel(r.status)} tone={requestTone(r.status)} />
                </View>
                <Text style={s.desc}>{r.message}</Text>
                {r.preferredDate ? <Text style={s.muted}>Preferred date: {r.preferredDate}</Text> : null}
                {quoteText(r.quote) ? <Text style={s.quote}>{quoteText(r.quote)}</Text> : null}
                {['requested', 'accepted', 'quotation_sent'].includes(r.status) ? (
                  <Btn title="Manage in Service Requests" variant="outline" style={{ marginTop: 10 }} onPress={() => navigation.navigate('ServiceRequests', { tab: 'received' })} />
                ) : null}
                {r.status === 'requested' ? (
                  <Btn title="Decline" variant="outline" style={{ marginTop: 8 }} onPress={() => updateRequest(r, 'cancelled', 'Decline request')} />
                ) : null}
              </Card>
            ))}
          </>
        ) : (
          <>
            {myRequest ? (
              <Card>
                <Text style={s.name}>Your request</Text>
                <View style={{ marginTop: 8 }}><StatusPill label={requestLabel(myRequest.status)} tone={requestTone(myRequest.status)} /></View>
                <Text style={s.desc}>{myRequest.message}</Text>
                {quoteText(myRequest.quote) ? <Text style={s.quote}>{quoteText(myRequest.quote)}</Text> : null}
                <Btn title="View my requests" variant="outline" style={{ marginTop: 10 }} onPress={() => navigation.navigate('ServiceRequests')} />
              </Card>
            ) : closed ? (
              <Text style={[s.muted, { paddingHorizontal: 16 }]}>This listing is closed.</Text>
            ) : (
              <Card>
                <Text style={[s.name, { marginBottom: 10 }]}>Request service</Text>
                {isSample ? <Text style={[s.muted, { marginBottom: 10 }]}>Sample listing - requests are disabled.</Text> : null}
                <Field label="Message" required value={message} onChangeText={setMessage} placeholder="Describe what you need" multiline style={{ marginBottom: 14 }} />
                <Field label="Preferred date" value={date} onChangeText={setDate} placeholder="e.g. 2026-11-15" />
                <Field label="Contact info (optional)" value={contact} onChangeText={setContact} placeholder="Phone or email" />
                <Btn title={busy ? 'Sending...' : 'Request service'} disabled={busy || isSample} onPress={sendRequest} />
              </Card>
            )}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { alignItems: 'center', marginTop: 60, paddingHorizontal: 24 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 18, fontWeight: '800', color: C.text },
  name: { fontSize: 15, fontWeight: '800', color: C.text },
  muted: { color: C.muted, fontSize: 13, marginTop: 2 },
  desc: { color: C.text, fontSize: 14, lineHeight: 20, marginTop: 10 },
  quote: { color: C.purple, fontWeight: '700', marginTop: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8 },
  detailLabel: { fontSize: 11, color: C.muted, fontWeight: '700' },
  detailValue: { fontSize: 14, color: C.text, marginTop: 2 },
  actions: { flexDirection: 'row', paddingHorizontal: 16 },
});
