import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import apiService from '../../shared/services/apiService';
import { BlueHeader, Btn, C, Card, StatusPill } from '../../shared/ui/kit';
import { confirmAction, notify, quoteText, requestLabel, requestTone } from './serviceHelpers';

export const ServiceRequestsScreen = ({ navigation, route }) => {
  const [tab, setTab] = useState(route?.params?.tab === 'received' ? 'received' : 'sent');
  const [sent, setSent] = useState([]);
  const [received, setReceived] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [quoting, setQuoting] = useState(null); // request id currently being quoted
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    try {
      const [mine, inc] = await Promise.all([
        apiService.request('/services/mine'),
        apiService.request('/services/requests/incoming'),
      ]);
      setSent(mine.requests || []); setReceived(inc.requests || []); setError('');
    } catch (e) { setError(e.message || 'Could not load requests.'); }
    setLoading(false); setRefreshing(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const update = async (req, status, extra) => {
    try { await apiService.request(`/service-requests/${req._id}`, 'PUT', { status, ...extra }); setQuoting(null); load(true); }
    catch (e) { notify('Update request', e.message); }
  };
  const act = (req, status, title, message) => confirmAction(title, message, () => update(req, status));

  const sendQuote = req => {
    const value = Number(amount);
    if (!amount.trim() || Number.isNaN(value) || value <= 0) { notify('Quotation', 'Enter a valid amount.'); return; }
    confirmAction('Send quotation', `Send a quotation of ${value} to ${req.customerName || 'the customer'}?`,
      () => update(req, 'quotation_sent', { quote: { amount: value, note: note.trim() } }), 'Send');
    setAmount(''); setNote('');
  };

  const list = tab === 'sent' ? sent : received;

  const renderActions = (req) => {
    if (tab === 'sent') {
      return (
        <View style={s.actions}>
          {req.status === 'quotation_sent' ? <Btn title="Accept quote" style={s.act} onPress={() => act(req, 'accepted', 'Accept quote', 'Accept this quotation?')} /> : null}
          {['requested', 'quotation_sent', 'accepted'].includes(req.status) ? <Btn title="Cancel" variant="outline" style={s.act} onPress={() => act(req, 'cancelled', 'Cancel request', 'Cancel this service request?')} /> : null}
        </View>
      );
    }
    return (
      <View>
        <View style={s.actions}>
          {['requested', 'quotation_sent'].includes(req.status) ? <Btn title={req.status === 'requested' ? 'Send quotation' : 'Revise quote'} style={s.act} onPress={() => setQuoting(quoting === req._id ? null : req._id)} /> : null}
          {req.status === 'accepted' ? <Btn title="Start" style={s.act} onPress={() => act(req, 'in_progress', 'Start job', 'Mark this job as in progress?')} /> : null}
          {req.status === 'in_progress' ? <Btn title="Complete" style={s.act} onPress={() => act(req, 'completed', 'Complete job', 'Mark this job as completed?')} /> : null}
          {['requested', 'quotation_sent', 'accepted', 'in_progress'].includes(req.status) ? <Btn title="Cancel" variant="outline" style={s.act} onPress={() => act(req, 'cancelled', 'Cancel request', 'Cancel this service request?')} /> : null}
        </View>
        {quoting === req._id ? (
          <View style={{ marginTop: 10 }}>
            <TextInput value={amount} onChangeText={setAmount} placeholder="Amount" keyboardType="numeric" placeholderTextColor="#9AA6BC" style={s.input} />
            <TextInput value={note} onChangeText={setNote} placeholder="Note (what is included)" placeholderTextColor="#9AA6BC" style={[s.input, { marginTop: 8 }]} />
            <Btn title="Send quotation" style={{ marginTop: 8 }} onPress={() => sendQuote(req)} />
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <BlueHeader title="Service Requests" onBack={() => navigation.goBack()}>
        <View style={s.tabs}>
          {[['sent', 'Sent'], ['received', 'Received']].map(([key, label]) => (
            <TouchableOpacity key={key} style={[s.tab, tab === key && s.tabOn]} onPress={() => setTab(key)}>
              <Text style={[s.tabText, tab === key && { color: C.blue }]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </BlueHeader>
      {loading ? <ActivityIndicator color={C.blue} style={{ marginTop: 40 }} /> : (
        <ScrollView keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />} contentContainerStyle={{ paddingTop: 14, paddingBottom: 40 }}>
          {error ? <Text style={{ color: C.red, paddingHorizontal: 16, marginBottom: 10 }}>{error}</Text> : null}
          {!list.length && !error ? (
            <View style={{ alignItems: 'center', marginTop: 50 }}>
              <Ionicons name="document-text-outline" size={44} color={C.blueLine} />
              <Text style={{ color: C.muted, marginTop: 8 }}>{tab === 'sent' ? 'You have not requested any services.' : 'No requests received yet.'}</Text>
            </View>
          ) : null}
          {list.map(req => (
            <Card key={req._id} onPress={req.serviceId ? () => navigation.navigate('ServiceDetail', { serviceId: req.serviceId }) : undefined}>
              <View style={s.between}>
                <Text style={s.title} numberOfLines={1}>{req.serviceTitle || 'Service'}</Text>
                <StatusPill label={requestLabel(req.status)} tone={requestTone(req.status)} />
              </View>
              <Text style={s.sub}>{tab === 'sent' ? `Provider: ${req.providerName || '-'}` : `Customer: ${req.customerName || '-'}`}</Text>
              {req.message ? <Text style={s.msg}>{req.message}</Text> : null}
              {req.preferredDate ? <Text style={s.sub}>Preferred date: {req.preferredDate}</Text> : null}
              {quoteText(req.quote) ? <Text style={s.quote}>{quoteText(req.quote)}</Text> : null}
              {renderActions(req)}
            </Card>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  tabs: { flexDirection: 'row', marginTop: 14, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 12, padding: 3 },
  tab: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 10 },
  tabOn: { backgroundColor: '#fff' },
  tabText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { flex: 1, fontSize: 15, fontWeight: '800', color: C.text, marginRight: 8 },
  sub: { color: C.muted, fontSize: 12, marginTop: 4 },
  msg: { color: C.text, fontSize: 13, marginTop: 6 },
  quote: { color: C.purple, fontWeight: '700', marginTop: 6 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  act: { paddingVertical: 9, paddingHorizontal: 16, marginRight: 8, marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, height: 44, fontSize: 14, color: C.text },
});
