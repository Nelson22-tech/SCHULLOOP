import { Ionicons } from '@expo/vector-icons';
import { useCallback, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Image, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BlueHeader, Btn, C, Card, IconBtn, IconTile, Initials, JOB_BAR, ModuleBar, SearchField, SectionTitle } from '../../shared/ui/kit';
import apiService from '../../shared/services/apiService';
import { AuthContext } from '../auth/AuthContext';
import { JobCard, applyJobFilters, fetchJobs, getJobId, getSavedIds, toggleSavedId } from '../jobs/jobHelpers';

const QUICK_ACTIONS = [
  { label: 'Find Jobs', icon: 'search-outline', route: 'JobSearch' },
  { label: 'My Applications', icon: 'clipboard-outline', route: 'MyJobApplications' },
  { label: 'Saved Jobs', icon: 'bookmark-outline', route: 'SavedJobs' },
  { label: 'Career Resources', icon: 'folder-open-outline', route: 'CareerDocuments' },
];

const WORKFLOW = ['Publish a job opportunity', 'Review qualified applicants', 'Shortlist candidates', 'Message and schedule interviews', 'Update application outcomes'];

export const GraduateTalentPortalScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const isEmployer = user?.userType === 'employer';
  const [jobs, setJobs] = useState([]);
  const [saved, setSaved] = useState([]);
  const [query, setQuery] = useState('');
  const [employerJobs, setEmployerJobs] = useState([]);
  const [employerApplications, setEmployerApplications] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    try {
      const [list, ids] = await Promise.all([fetchJobs(), getSavedIds()]);
      setJobs(list); setSaved(ids);
      if (isEmployer) {
        const own = await apiService.getEmployerJobs();
        setEmployerJobs(own.jobs || []);
        const results = await Promise.all((own.jobs || []).map(j => apiService.getEmployerJobApplications(j._id).catch(() => ({ applications: [] }))));
        setEmployerApplications(results.reduce((n, x) => n + (x.applications || []).length, 0));
      }
    } catch (e) { /* keep whatever is loaded; the sample jobs still render */ }
    setLoading(false); setRefreshing(false);
  }, [isEmployer]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { const unsub = navigation.addListener('focus', () => getSavedIds().then(setSaved)); return unsub; }, [navigation]);

  const toggle = async id => setSaved(await toggleSavedId(id, saved));
  const search = () => navigation.navigate('JobListings', { filters: { query } });
  const featured = applyJobFilters(jobs, { query }).slice(0, 5);

  const avatar = user?.avatarUrl
    ? <Image source={{ uri: user.avatarUrl }} style={s.avatar} />
    : <Initials name={user?.fullName || 'User'} size={34} bg={C.blueDark} />;

  const header = (
    <BlueHeader brand style={{ paddingBottom: 20 }}
      right={<>
        <IconBtn name="notifications-outline" onPress={() => navigation.navigate('Notifications')} />
        <TouchableOpacity style={{ marginLeft: 14 }} onPress={() => navigation.navigate('JobProfile')}>{avatar}</TouchableOpacity>
      </>}>
      <Text style={s.welcome}>{isEmployer ? 'Employer workspace' : 'Welcome back,'}</Text>
      <Text style={s.name}>{user?.fullName || 'Future professional'}</Text>
      <Text style={s.sub}>{isEmployer ? 'Manage your hiring pipeline and discover student talent.' : "Your career matters. Let's find the right opportunity for you."}</Text>
      {!isEmployer ? (
        <SearchField value={query} onChangeText={setQuery} onSubmitEditing={search} placeholder="Search jobs, skills, or companies..." />
      ) : null}
    </BlueHeader>
  );

  return (
    <View style={s.root}>
      {header}
      {loading ? <ActivityIndicator color={C.blue} style={{ marginTop: 40 }} /> : (
        <ScrollView style={{ flex: 1 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />} contentContainerStyle={{ paddingBottom: 20 }}>
          {isEmployer ? (
            <>
              <View style={s.stats}>
                <Card style={s.stat}><Text style={s.statNum}>{employerJobs.length}</Text><Text style={s.statLabel}>My opportunities</Text></Card>
                <Card style={s.stat}><Text style={s.statNum}>{employerApplications}</Text><Text style={s.statLabel}>Applications received</Text></Card>
              </View>
              <View style={s.employerBtns}>
                <Btn title="Post a Job" icon="add-circle-outline" onPress={() => navigation.navigate('PostJob')} style={{ flex: 1, marginRight: 8 }} />
                <Btn title="My Job Listings" variant="outline" onPress={() => navigation.navigate('EmployerJobs')} style={{ flex: 1 }} />
              </View>
              <SectionTitle title="Hiring workflow" />
              <Card>
                {WORKFLOW.map((x, i) => (
                  <View key={x} style={s.flow}>
                    <View style={s.flowNum}><Text style={s.flowNumText}>{i + 1}</Text></View>
                    <Text style={s.flowText}>{x}</Text>
                  </View>
                ))}
              </Card>
              <SectionTitle title="Open opportunities" action="View All" onAction={() => navigation.navigate('JobListings')} />
              {featured.map(job => (
                <JobCard key={getJobId(job)} job={job} showApply={false} showSave={false} onPress={() => navigation.navigate('JobDetails', { job })} />
              ))}
            </>
          ) : (
            <>
              <View style={s.quick}>
                {QUICK_ACTIONS.map(a => (
                  <TouchableOpacity key={a.label} style={s.quickItem} onPress={() => navigation.navigate(a.route)}>
                    <IconTile name={a.icon} color="#fff" bg={C.blue} box={52} round={14} />
                    <Text style={s.quickLabel}>{a.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <SectionTitle title="Featured Jobs" action="View All" onAction={() => navigation.navigate('JobListings')} />
              {featured.map(job => (
                <JobCard
                  key={getJobId(job)}
                  job={job}
                  saved={saved.includes(getJobId(job))}
                  onToggleSave={() => toggle(getJobId(job))}
                  onPress={() => navigation.navigate('JobDetails', { job })}
                  onApply={() => navigation.navigate('JobDetails', { job })}
                />
              ))}
              {!featured.length ? (
                <View style={s.empty}>
                  <Ionicons name="briefcase-outline" size={40} color={C.blueLine} />
                  <Text style={s.emptyText}>No jobs match your search.</Text>
                </View>
              ) : null}
            </>
          )}
        </ScrollView>
      )}
      <ModuleBar items={JOB_BAR} active="jobs" navigation={navigation} />
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.blueDark },
  welcome: { color: '#D6E5FF', fontSize: 12, marginTop: 14 },
  name: { color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 2 },
  sub: { color: '#D6E5FF', fontSize: 12.5, marginTop: 6, lineHeight: 18 },
  quick: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 18 },
  quickItem: { flex: 1, alignItems: 'center' },
  quickLabel: { fontSize: 11.5, fontWeight: '700', color: C.text, marginTop: 8, textAlign: 'center' },
  empty: { alignItems: 'center', marginTop: 30 },
  emptyText: { color: C.muted, marginTop: 8 },
  stats: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 16 },
  stat: { flex: 1, marginHorizontal: 4, alignItems: 'center', paddingVertical: 18 },
  statNum: { fontSize: 26, fontWeight: '800', color: C.blue },
  statLabel: { fontSize: 12, color: C.muted, marginTop: 4 },
  employerBtns: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 14 },
  flow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  flowNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  flowNumText: { color: '#fff', fontWeight: '800', fontSize: 12.5 },
  flowText: { fontSize: 13.5, color: C.text, fontWeight: '600', flex: 1 },
});
