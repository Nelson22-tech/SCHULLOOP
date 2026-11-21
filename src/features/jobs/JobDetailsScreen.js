import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, Image, View } from 'react-native';
import { Btn, C, topPad } from '../../shared/ui/kit';
import { CompanyLogo, getJobId, getSavedIds, jobLocation, jobTypeLabel, toggleSavedId } from './jobHelpers';

export const JobDetailsScreen = ({ navigation, route }) => {
  const job = route?.params?.job || {};
  const [saved, setSaved] = useState(false);
  useEffect(() => { getSavedIds().then(ids => setSaved(ids.includes(getJobId(job)))); }, [job]);
  const toggle = async () => {
    const ids = await getSavedIds();
    const next = await toggleSavedId(getJobId(job), ids);
    setSaved(next.includes(getJobId(job)));
  };
  const requirements = (job.requirements && job.requirements.length ? job.requirements : job.skills) || [];

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={s.hero}>
          {job.image || job.imageUrl || job.bannerUrl
            ? <Image source={{ uri: job.image || job.imageUrl || job.bannerUrl }} style={StyleSheet.absoluteFill} />
            : <Ionicons name="business" size={72} color="#9CC0F5" />}
          <TouchableOpacity style={[s.roundBtn, { left: 16 }]} onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={20} color="#fff" /></TouchableOpacity>
          <TouchableOpacity style={[s.roundBtn, { right: 16 }]} onPress={toggle}><Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={20} color="#fff" /></TouchableOpacity>
        </View>
        <View style={s.sheet}>
          <View style={s.logo}><CompanyLogo job={job} size={60} /></View>
          <Text style={s.title}>{job.title}</Text>
          <Text style={s.company}>{job.company}</Text>
          <View style={s.metaRow}>
            <Ionicons name="location-outline" size={15} color={C.muted} /><Text style={s.meta}> {jobLocation(job)}</Text>
            <Ionicons name="time-outline" size={15} color={C.muted} style={{ marginLeft: 16 }} /><Text style={s.meta}> {jobTypeLabel(job)}</Text>
          </View>
          {job.salary ? (
            <View style={[s.metaRow, { marginTop: 6 }]}>
              <Ionicons name="cash-outline" size={15} color={C.muted} /><Text style={s.meta}> {job.salary}</Text>
            </View>
          ) : null}
          <Text style={s.section}>About the Job</Text>
          <Text style={s.body}>{job.description || 'No description provided.'}</Text>
          {requirements.length ? (
            <>
              <Text style={s.section}>Requirements</Text>
              {requirements.map(r => (
                <View key={r} style={s.reqRow}>
                  <Ionicons name="checkmark" size={16} color={C.green} />
                  <Text style={s.req}>{r}</Text>
                </View>
              ))}
            </>
          ) : null}
          <Btn title="Apply Now" onPress={() => navigation.navigate('ApplyJob', { job })} style={{ marginTop: 22 }} />
        </View>
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  hero: { height: 190 + topPad / 2, backgroundColor: '#CFE0FA', alignItems: 'center', justifyContent: 'center', paddingTop: topPad / 2 },
  roundBtn: { position: 'absolute', top: topPad, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(15,42,92,0.45)', alignItems: 'center', justifyContent: 'center' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, marginTop: -20, paddingHorizontal: 18, paddingBottom: 10 },
  logo: { marginTop: -30, marginBottom: 10, width: 66, height: 66, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  title: { fontSize: 20, fontWeight: '800', color: C.text },
  company: { fontSize: 15, color: C.muted, marginTop: 2, marginBottom: 10 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  meta: { fontSize: 13, color: C.muted },
  section: { fontSize: 16, fontWeight: '800', color: C.text, marginTop: 22, marginBottom: 8 },
  body: { fontSize: 13.5, color: '#44546F', lineHeight: 21 },
  reqRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  req: { flex: 1, marginLeft: 8, fontSize: 13, color: '#44546F', lineHeight: 19 },
});
