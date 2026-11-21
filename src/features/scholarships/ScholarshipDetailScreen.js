import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import apiService from '../../shared/services/apiService';
import { BlueHeader, Btn, C, Card, SectionTitle, StatusPill } from '../../shared/ui/kit';
import { IMMIGRATION_WARNING, MODE_LABELS, TYPE_LABELS, daysLeft, deadlineNote, formatDate } from './scholarshipHelpers';

const Info = ({ icon, label, value }) => (value ? (
  <View style={s.info}>
    <Ionicons name={icon} size={18} color={C.blue} style={{ width: 28 }} />
    <View style={{ flex: 1 }}><Text style={s.infoLabel}>{label}</Text><Text style={s.infoValue}>{value}</Text></View>
  </View>
) : null);

export const ScholarshipDetailScreen = ({ navigation, route }) => {
  const item = route?.params?.item || {};
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!item._id || item.sample) return;
    apiService.request('/saved?itemType=scholarship')
      .then(r => setSaved((r.items || []).some(i => String(i.itemId) === String(item._id))))
      .catch(() => {});
  }, [item._id, item.sample]);

  const toggleSave = async () => {
    if (item.sample) { Alert.alert('Sample listing', 'Sample listings cannot be saved.'); return; }
    try {
      const r = await apiService.request('/saved/toggle', 'POST', { itemType: 'scholarship', itemId: item._id });
      setSaved(!!r.saved);
    } catch (e) { Alert.alert('Save', e.message); }
  };

  const open = async () => {
    const url = String(item.applyUrl || '').trim();
    if (!/^https?:\/\//i.test(url)) { Alert.alert('Apply', item.sample ? 'This is a sample listing.' : 'No valid application link is available.'); return; }
    try { await Linking.openURL(url); } catch (e) { Alert.alert('Apply', 'Could not open the link.'); }
  };

  const n = daysLeft(item.deadline);
  const closed = n !== null && n < 0;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <BlueHeader title={TYPE_LABELS[item.type] || 'Details'} onBack={() => navigation.goBack()}
        right={<TouchableOpacity onPress={toggleSave} hitSlop={10}><Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={22} color="#fff" /></TouchableOpacity>} />
      <ScrollView contentContainerStyle={{ paddingTop: 14, paddingBottom: 40 }}>
        <Card>
          <Text style={s.title}>{item.title}</Text>
          <Text style={s.provider}>{item.provider}</Text>
          <View style={s.pills}>
            <StatusPill label={TYPE_LABELS[item.type] || 'Opportunity'} tone="blue" style={s.pill} />
            {item.level ? <StatusPill label={item.level} tone="purple" style={s.pill} /> : null}
            {item.verified ? <StatusPill label="Verified" tone="green" style={s.pill} /> : null}
            {item.sample ? <StatusPill label="Sample" tone="gray" style={s.pill} /> : null}
          </View>
        </Card>
        {item.type === 'immigration' ? <Card><View style={{ flexDirection: 'row' }}><Ionicons name="warning" size={18} color="#B45309" style={{ marginRight: 8, marginTop: 1 }} /><Text style={[s.body, { flex: 1, color: '#92400E' }]}>{IMMIGRATION_WARNING}</Text></View></Card> : null}
        <Card>
          <Info icon="location-outline" label="Location / mode" value={[item.location, MODE_LABELS[item.mode] || item.mode].filter(Boolean).join(' - ')} />
          <Info icon="calendar-outline" label="Deadline" value={`${formatDate(item.deadline)}${deadlineNote(item.deadline) ? `  (${deadlineNote(item.deadline)})` : ''}`} />
          <Info icon="link-outline" label="Source" value={item.source} />
        </Card>
        {item.description ? <><SectionTitle title="Description" /><Card><Text style={s.body}>{item.description}</Text></Card></> : null}
        {item.eligibility ? <><SectionTitle title="Eligibility" /><Card><Text style={s.body}>{item.eligibility}</Text></Card></> : null}
        <SectionTitle title="How to apply" />
        <Card>
          <Text style={s.body}>{item.howToApply || item.instructions || 'Use the button below to open the official application page and follow the instructions there.'}</Text>
        </Card>
        <View style={{ paddingHorizontal: 16 }}>
          <Btn title={closed ? 'Closed - view details' : 'Apply / Learn more'} icon="open-outline" onPress={open} disabled={!!item.sample} />
          {item.sample ? <Text style={s.note}>Sample listing - application link disabled.</Text> : null}
          <Btn title={saved ? 'Saved' : 'Save'} icon={saved ? 'bookmark' : 'bookmark-outline'} variant="outline" style={{ marginTop: 10 }} onPress={toggleSave} />
        </View>
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  title: { fontSize: 18, fontWeight: '800', color: C.text },
  provider: { fontSize: 14, color: C.muted, marginTop: 4 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  pill: { marginRight: 6, marginBottom: 4 },
  info: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8 },
  infoLabel: { fontSize: 11, color: C.muted, fontWeight: '700' },
  infoValue: { fontSize: 14, color: C.text, marginTop: 2 },
  body: { fontSize: 14, color: C.text, lineHeight: 21 },
  note: { color: C.muted, fontSize: 12, textAlign: 'center', marginTop: 8 },
});
