import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BlueHeader, C, Card, IconTile, SectionTitle, StatusPill, k, toneFor } from '../../shared/ui/kit';
import apiService from '../../shared/services/apiService';

// Routes that Recent items may open (guards against unknown routes from the API).
export const VALID_ROUTES = ['Favorites', 'MyJobApplications', 'MyApplications', 'ServiceRequests', 'MyListings', 'Freelance', 'ProjectDetail', 'ServiceDetail', 'JobDetails', 'JobApplicationDetails', 'ScholarshipDetail', 'Scholarships', 'SchoolDetail'];
export const EMPTY_SUMMARY = { savedSchools: 0, jobApplications: 0, projectsPosted: 0, proposalsSent: 0, serviceRequestsSent: 0, serviceRequestsIncoming: 0, listings: 0, recent: [] };
export const fetchSummary = async () => {
  try { return { ...EMPTY_SUMMARY, ...(await apiService.request('/activities/summary')) }; } catch (e) { return { ...EMPTY_SUMMARY, failed: true }; }
};
export const openRecent = (navigation, item) => {
  if (item && item.route && VALID_ROUTES.includes(item.route)) navigation.navigate(item.route, item.params || undefined);
};
const when = (v) => { const d = new Date(v); return isNaN(d) ? '' : d.toLocaleDateString(); };

export const ActivitiesScreen = ({ navigation }) => {
  const [sum, setSum] = useState(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mine, setMine] = useState(null);
  const [mineOpen, setMineOpen] = useState(false);
  const [mineLoading, setMineLoading] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    setSum(await fetchSummary());
    if (quiet || mineOpen) loadMine();
    setLoading(false); setRefreshing(false);
  }, [mineOpen]);
  useEffect(() => { load(); }, []);
  useEffect(() => { const u = navigation.addListener('focus', () => load()); return u; }, [navigation, load]);

  async function loadMine() {
    setMineLoading(true);
    try { setMine(await apiService.request('/projects/mine')); } catch (e) { setMine({ posted: [], proposals: [], error: true }); }
    setMineLoading(false);
  }
  const toggleMine = () => { const next = !mineOpen; setMineOpen(next); if (next && !mine) loadMine(); };

  const rows = [
    { icon: 'heart', title: 'Saved Schools', count: sum.savedSchools, route: 'Favorites', color: C.red, bg: C.redSoft },
    { icon: 'briefcase', title: 'Job Applications', count: sum.jobApplications, route: 'MyJobApplications', color: C.purple, bg: C.purpleSoft },
    { icon: 'document-text', title: 'School Applications', route: 'MyApplications', color: C.green, bg: C.greenSoft },
    { icon: 'construct', title: 'Service Requests', count: (sum.serviceRequestsSent || 0) + (sum.serviceRequestsIncoming || 0), sub: `${sum.serviceRequestsSent || 0} sent · ${sum.serviceRequestsIncoming || 0} received`, route: 'ServiceRequests', color: C.amber, bg: C.amberSoft },
    { icon: 'list', title: 'My Listings', count: sum.listings, route: 'MyListings', color: C.blue, bg: C.blueSoft },
  ];

  return (
    <View style={k.screen}>
      <BlueHeader title="My Activities" subtitle="Everything you have saved, applied for and posted" />
      {loading ? <ActivityIndicator color={C.blue} style={{ marginTop: 40 }} /> : (
        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />} contentContainerStyle={{ paddingTop: 16, paddingBottom: 28 }}>
          {sum.failed ? <Text style={s.warn}>Could not load your activity counts. Pull down to retry.</Text> : null}

          <Card style={{ paddingVertical: 2, paddingHorizontal: 14 }}>
            {rows.map((r, i) => (
              <TouchableOpacity key={r.title} activeOpacity={0.75} onPress={() => navigation.navigate(r.route)} style={[s.row, i < rows.length - 1 && s.border]}>
                <IconTile name={r.icon} color={r.color} bg={r.bg} box={40} size={20} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={s.title}>{r.title}</Text>
                  {r.sub ? <Text style={s.sub}>{r.sub}</Text> : null}
                </View>
                {r.count !== undefined ? <Text style={s.count}>{r.count}</Text> : null}
                <Ionicons name="chevron-forward" size={18} color={C.muted} />
              </TouchableOpacity>
            ))}
            <TouchableOpacity activeOpacity={0.75} onPress={toggleMine} style={s.row}>
              <IconTile name="laptop" color={C.blue} bg={C.blueSoft} box={40} size={20} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={s.title}>Freelance Projects</Text>
                <Text style={s.sub}>{sum.projectsPosted || 0} posted · {sum.proposalsSent || 0} proposals sent</Text>
              </View>
              <Ionicons name={mineOpen ? 'chevron-up' : 'chevron-down'} size={18} color={C.muted} />
            </TouchableOpacity>
          </Card>

          {mineOpen ? (
            <Card>
              {mineLoading ? <ActivityIndicator color={C.blue} /> : (
                <>
                  <Text style={s.group}>Projects I posted</Text>
                  {(mine?.posted || []).length === 0 ? <Text style={s.sub}>You have not posted any projects.</Text> : mine.posted.map(p => (
                    <TouchableOpacity key={p._id} style={s.mini} onPress={() => navigation.navigate('ProjectDetail', { projectId: p._id, project: p })}>
                      <Text style={[s.title, { flex: 1 }]} numberOfLines={1}>{p.title}</Text>
                      <StatusPill label={String(p.status || '').replace('_', ' ')} tone={toneFor(p.status)} />
                    </TouchableOpacity>
                  ))}
                  <Text style={[s.group, { marginTop: 14 }]}>Proposals I sent</Text>
                  {(mine?.proposals || []).length === 0 ? <Text style={s.sub}>You have not sent any proposals.</Text> : mine.proposals.map(p => (
                    <TouchableOpacity key={p._id} style={s.mini} onPress={() => p.projectId?._id && navigation.navigate('ProjectDetail', { projectId: p.projectId._id })}>
                      <Text style={[s.title, { flex: 1 }]} numberOfLines={1}>{p.projectId?.title || 'Project'}</Text>
                      <StatusPill label={p.status || 'submitted'} tone={toneFor(p.status === 'selected' ? 'accepted' : p.status)} />
                    </TouchableOpacity>
                  ))}
                  {mine?.error ? <Text style={s.warn}>Could not load your projects.</Text> : null}
                  <TouchableOpacity onPress={() => navigation.navigate('Freelance')}><Text style={[k.link, { marginTop: 12 }]}>Browse freelance projects</Text></TouchableOpacity>
                </>
              )}
            </Card>
          ) : null}

          <SectionTitle title="Recent" />
          <Card style={{ paddingVertical: 2, paddingHorizontal: 14 }}>
            {(sum.recent || []).length === 0 ? <Text style={[s.sub, { paddingVertical: 14 }]}>No recent activity yet. Apply for a job, save a school or send a request and it will show here.</Text>
              : sum.recent.map((r, i) => (
                <TouchableOpacity key={`${r.type}-${i}`} activeOpacity={0.75} onPress={() => openRecent(navigation, r)} style={[s.row, i < sum.recent.length - 1 && s.border]}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.title} numberOfLines={1}>{r.title}</Text>
                    <Text style={s.sub}>{String(r.type || '').replace(/_/g, ' ')}{r.at ? ` · ${when(r.at)}` : ''}</Text>
                  </View>
                  {r.status ? <StatusPill label={String(r.status).replace(/_/g, ' ')} tone={toneFor(r.status)} /> : null}
                </TouchableOpacity>
              ))}
          </Card>
        </ScrollView>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  border: { borderBottomWidth: 1, borderBottomColor: '#EDF2FA' },
  title: { fontSize: 14, fontWeight: '700', color: C.text },
  sub: { fontSize: 12, color: C.muted, marginTop: 2 },
  count: { fontSize: 16, fontWeight: '900', color: C.blue, marginRight: 8 },
  group: { fontSize: 12, fontWeight: '800', color: C.muted, marginBottom: 6 },
  mini: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  warn: { color: C.red, fontSize: 12, marginHorizontal: 16, marginBottom: 10 },
});
