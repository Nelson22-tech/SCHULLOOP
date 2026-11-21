import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BlueHeader, Btn, C, Card, Chip, ChipRow, IconTile, Initials, SearchField, SectionTitle, StatusPill } from '../../shared/ui/kit';
import { SAMPLE_FREELANCERS, SAMPLE_PROJECTS, api, budgetText, categoryStyle, statusLabel, statusTone } from './freelanceApi';

const TABS = ['Projects', 'Freelancers', 'My Projects'];
const FILTERS = ['All', 'Design', 'Development', 'Writing', 'Marketing', 'Video'];

export const FreelanceScreen = ({ navigation }) => {
  const [tab, setTab] = useState('Projects');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [projects, setProjects] = useState([]);
  const [freelancers, setFreelancers] = useState([]);
  const [mine, setMine] = useState({ posted: [], proposals: [] });
  const [usingSample, setUsingSample] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const qs = [`status=open`, category !== 'All' ? `category=${encodeURIComponent(category)}` : '', query.trim() ? `q=${encodeURIComponent(query.trim())}` : ''].filter(Boolean).join('&');
      if (tab === 'Projects') {
        let list = [];
        try { list = (await api(`/projects?${qs}`)).projects || []; } catch (e) { setError('Could not reach the server. Showing sample listings.'); }
        // SAMPLE_PROJECTS fallback: only when the API is empty or failed and no filter is applied.
        const noFilter = category === 'All' && !query.trim();
        if (!list.length && noFilter) { setProjects(SAMPLE_PROJECTS); setUsingSample(true); } else { setProjects(list); setUsingSample(false); }
      } else if (tab === 'Freelancers') {
        let list = [];
        try { list = (await api(`/freelancers${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ''}`)).freelancers || []; } catch (e) { setError('Could not reach the server. Showing sample profiles.'); }
        if (!list.length && !query.trim()) { setFreelancers(SAMPLE_FREELANCERS); setUsingSample(true); } else { setFreelancers(list); setUsingSample(false); }
      } else {
        setUsingSample(false);
        const res = await api('/projects/mine');
        setMine({ posted: res.posted || [], proposals: res.proposals || [] });
      }
    } catch (e) {
      setError(e.message || 'Something went wrong. Pull down to retry.');
    } finally { setLoading(false); setRefreshing(false); }
  }, [tab, category, query]);

  useEffect(() => { load(); }, [tab, category]); // search runs on submit

  const openProject = (id) => navigation.navigate('ProjectDetail', { projectId: id });

  const renderProject = (p) => {
    const st = categoryStyle(p.category);
    return (
      <Card key={p._id} onPress={() => openProject(p._id)} style={s.row}>
        <IconTile name={st.icon} color={st.color} bg={st.bg} box={52} />
        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <Text style={s.title} numberOfLines={2}>{p.title}</Text>
          <Text style={s.sub}>{p.category}</Text>
          <View style={s.metaRow}>
            <Ionicons name="cash-outline" size={14} color={C.amber} />
            <Text style={s.meta}>{budgetText(p)}</Text>
            {p.duration ? <Text style={s.metaDim}>{'  •  '}{p.duration}</Text> : null}
          </View>
        </View>
        <TouchableOpacity style={s.apply} onPress={() => openProject(p._id)}><Text style={s.applyText}>Apply</Text></TouchableOpacity>
      </Card>
    );
  };

  const renderFreelancer = (f) => (
    <Card key={f._id} style={s.freeCard}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Initials name={f.name} size={46} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.title}>{f.name}</Text>
          <Text style={s.sub}>{f.title}</Text>
        </View>
        <StatusPill label={f.availability === 'available' ? 'Available' : 'Busy'} tone={f.availability === 'available' ? 'green' : 'gray'} />
      </View>
      <View style={s.skillRow}>{(f.skills || []).slice(0, 5).map(sk => <View key={sk} style={s.skill}><Text style={s.skillText}>{sk}</Text></View>)}</View>
      {f.rate ? <Text style={s.meta}>Rate: {f.rate}</Text> : null}
    </Card>
  );

  const renderMine = () => (
    <>
      <SectionTitle title="Posted by me" />
      {mine.posted.length === 0 ? <Text style={s.empty}>You have not posted any projects yet.</Text> : mine.posted.map(p => (
        <Card key={p._id} onPress={() => openProject(p._id)}>
          <View style={s.between}><Text style={[s.title, { flex: 1 }]}>{p.title}</Text><StatusPill label={statusLabel(p.status)} tone={statusTone(p.status)} /></View>
          <Text style={s.sub}>{p.proposalCount || 0} proposal{p.proposalCount === 1 ? '' : 's'}</Text>
        </Card>
      ))}
      <SectionTitle title="My proposals" style={{ marginTop: 10 }} />
      {mine.proposals.length === 0 ? <Text style={s.empty}>You have not sent any proposals yet.</Text> : mine.proposals.map(pr => (
        <Card key={pr._id} onPress={() => pr.projectId?._id && openProject(pr.projectId._id)}>
          <View style={s.between}><Text style={[s.title, { flex: 1 }]}>{pr.projectId?.title || 'Project'}</Text><StatusPill label={statusLabel(pr.status)} tone={statusTone(pr.status)} /></View>
          <Text style={s.sub}>Your price: ${pr.price}  {'•'}  {pr.deliveryDays} days</Text>
        </Card>
      ))}
    </>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <BlueHeader title="Freelance Projects" onBack={() => navigation.goBack()} right={<TouchableOpacity onPress={() => navigation.navigate('PostProject')} style={s.postBtn}><Ionicons name="add" size={16} color={C.blue} /><Text style={s.postText}>Post a Project</Text></TouchableOpacity>}>
        <View style={s.tabs}>
          {TABS.map(t => (
            <TouchableOpacity key={t} style={[s.tab, tab === t && s.tabOn]} onPress={() => setTab(t)}>
              <Text style={[s.tabText, tab === t && { color: C.blue }]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </BlueHeader>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />} contentContainerStyle={{ paddingBottom: 28 }}>
        {tab !== 'My Projects' && (
          <SearchField value={query} onChangeText={setQuery} onSubmitEditing={() => load()} placeholder={tab === 'Projects' ? 'Search projects...' : 'Search freelancers or skills...'} style={{ marginHorizontal: 16, borderWidth: 1, borderColor: C.border }} />
        )}
        {tab === 'Projects' && <ChipRow items={FILTERS} value={category} onChange={setCategory} />}
        {tab === 'Freelancers' && (
          <View style={{ marginHorizontal: 16, marginVertical: 12 }}>
            <Btn title="Activate / Edit my freelancer profile" icon="person-circle-outline" variant="outline" onPress={() => navigation.navigate('FreelancerProfile')} />
          </View>
        )}
        {error ? <Text style={s.error}>{error}</Text> : null}
        {usingSample ? <Text style={s.note}>Sample listings shown for preview. Applying is disabled for samples.</Text> : null}
        {loading ? <ActivityIndicator color={C.blue} style={{ marginTop: 40 }} /> : (
          tab === 'Projects' ? (projects.length ? projects.map(renderProject) : <Text style={s.empty}>No projects match your search.</Text>)
            : tab === 'Freelancers' ? (freelancers.length ? freelancers.map(renderFreelancer) : <Text style={s.empty}>No freelancers found.</Text>)
              : renderMine()
        )}
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  tabs: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 12, padding: 3, marginTop: 14 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10 },
  tabOn: { backgroundColor: '#fff' },
  tabText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  postBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6 },
  postText: { color: C.blue, fontWeight: '800', fontSize: 12, marginLeft: 2 },
  row: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 15, fontWeight: '800', color: C.text },
  sub: { fontSize: 12, color: C.muted, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, flexWrap: 'wrap' },
  meta: { fontSize: 12, color: C.text, fontWeight: '700', marginLeft: 4 },
  metaDim: { fontSize: 12, color: C.muted },
  apply: { backgroundColor: C.blue, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9 },
  applyText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  freeCard: {},
  skillRow: { flexDirection: 'row', flexWrap: 'wrap', marginVertical: 10 },
  skill: { backgroundColor: C.blueSoft, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, marginRight: 6, marginBottom: 6 },
  skillText: { color: C.blue, fontSize: 11, fontWeight: '700' },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  empty: { textAlign: 'center', color: C.muted, marginVertical: 24, paddingHorizontal: 24 },
  error: { color: C.red, marginHorizontal: 16, marginBottom: 8, fontSize: 12 },
  note: { color: C.amber, marginHorizontal: 16, marginBottom: 8, fontSize: 12, fontWeight: '700' },
});
