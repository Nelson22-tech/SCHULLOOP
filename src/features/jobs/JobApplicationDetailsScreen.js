import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { BlueHeader, Btn, C, Card, JOB_BAR, ModuleBar, StatusPill } from '../../shared/ui/kit';
import apiService from '../../shared/services/apiService';
import { CompanyLogo, appStatusLabel, appStatusTone, applicationJob, fetchJobs, formatDate, formatDateTime } from './jobHelpers';

// Timeline built only from real data: appliedAt, current status, and scheduled interviews.
const buildSteps = (app, interview) => {
  const st = app?.status;
  const reviewed = ['reviewing', 'interview', 'accepted', 'rejected'].includes(st);
  const interviewed = st === 'interview' || (st === 'accepted' && !!interview) || !!interview;
  return [
    { key: 'submitted', title: 'Application Submitted', sub: formatDateTime(app?.appliedAt), state: 'done' },
    { key: 'review', title: 'Under Review', sub: reviewed ? 'Completed' : 'In progress', state: reviewed ? 'done' : 'current' },
    {
      key: 'interview', title: 'Interview Scheduled',
      sub: interview?.scheduledAt ? formatDateTime(interview.scheduledAt) : 'Pending',
      state: st === 'interview' ? 'current' : interviewed ? 'done' : 'pending',
    },
    {
      key: 'offer', title: st === 'rejected' ? 'Not Selected' : 'Offer',
      sub: st === 'accepted' ? 'Offer extended' : st === 'rejected' ? 'Application closed' : 'Pending',
      state: st === 'accepted' ? 'done' : st === 'rejected' ? 'failed' : 'pending',
    },
  ];
};

const nextStep = (app, interview, company) => {
  switch (app?.status) {
    case 'interview': return `Prepare for your interview with ${company}.${interview?.scheduledAt ? ` Scheduled for ${formatDateTime(interview.scheduledAt)}.` : ''}`;
    case 'accepted': return `Congratulations! ${company} has accepted your application.`;
    case 'rejected': return `${company} has decided not to move forward. Keep exploring other roles.`;
    case 'withdrawn': return 'You withdrew this application.';
    default: return `${company} is reviewing your application. We will notify you of any update.`;
  }
};

export const JobApplicationDetailsScreen = ({ navigation, route }) => {
  const app = route?.params?.application || {};
  const [job, setJob] = useState({ company: app.company, title: app.jobTitle });
  const [interview, setInterview] = useState(null);

  useEffect(() => {
    let alive = true;
    fetchJobs().then(list => { const found = applicationJob(app, list); if (alive && found) setJob(found); }).catch(() => {});
    apiService.getInterviews().then(res => {
      const mine = (res?.interviews || []).filter(i => String(i.applicationId?._id || i.applicationId) === String(app._id));
      if (alive) setInterview(mine[0] || null);
    }).catch(() => {});
    return () => { alive = false; };
  }, [app._id]);

  const company = app.company || job.company || 'the employer';
  const steps = buildSteps(app, interview);

  return (
    <View style={s.root}>
      <BlueHeader title="Application Details" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ paddingTop: 16, paddingBottom: 20 }}>
        <Card>
          <View style={s.row}>
            <CompanyLogo job={{ ...job, company }} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.title}>{app.jobTitle || job.title}</Text>
              <Text style={s.company}>{company}</Text>
              <Text style={s.date}>Applied on {formatDate(app.appliedAt)}</Text>
            </View>
            <StatusPill label={appStatusLabel(app.status)} tone={appStatusTone(app.status)} />
          </View>
        </Card>

        <Text style={s.section}>Application Status</Text>
        <Card>
          {steps.map((step, i) => {
            const done = step.state === 'done';
            const current = step.state === 'current';
            const failed = step.state === 'failed';
            return (
              <View key={step.key} style={[s.step, current && s.stepCurrent]}>
                <View style={s.rail}>
                  <View style={[s.node, done && s.nodeDone, current && s.nodeCurrent, failed && s.nodeFailed]}>
                    {done ? <Ionicons name="checkmark" size={13} color="#fff" /> : failed ? <Ionicons name="close" size={13} color="#fff" /> : current ? <View style={s.innerDot} /> : null}
                  </View>
                  {i < steps.length - 1 ? <View style={[s.line, done && { backgroundColor: C.green }]} /> : null}
                </View>
                <View style={{ flex: 1, paddingBottom: 18 }}>
                  <Text style={[s.stepTitle, step.state === 'pending' && { color: C.muted }]}>{step.title}</Text>
                  <Text style={s.stepSub}>{step.sub}</Text>
                </View>
              </View>
            );
          })}
        </Card>

        <Card style={s.next}>
          <Text style={s.nextTitle}>Next Step</Text>
          <Text style={s.nextText}>{nextStep(app, interview, company)}</Text>
          <Btn title="View Details" variant="outline" style={{ marginTop: 12, paddingVertical: 10 }} onPress={() => navigation.navigate('JobDetails', { job: { ...job, title: job.title || app.jobTitle, company } })} />
        </Card>
      </ScrollView>
      <ModuleBar items={JOB_BAR} active="applications" navigation={navigation} />
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  title: { fontSize: 16, fontWeight: '800', color: C.text },
  company: { fontSize: 13, color: C.muted, marginTop: 2 },
  date: { fontSize: 12, color: C.muted, marginTop: 6 },
  section: { fontSize: 16, fontWeight: '800', color: C.text, paddingHorizontal: 16, marginTop: 6, marginBottom: 10 },
  step: { flexDirection: 'row', borderRadius: 10 },
  stepCurrent: { backgroundColor: C.blueSoft },
  rail: { width: 30, alignItems: 'center' },
  node: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: C.blueLine, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  nodeDone: { backgroundColor: C.green, borderColor: C.green },
  nodeCurrent: { borderColor: C.blue },
  nodeFailed: { backgroundColor: C.red, borderColor: C.red },
  innerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.blue },
  line: { flex: 1, width: 2, backgroundColor: C.blueLine, marginTop: 2 },
  stepTitle: { fontSize: 14, fontWeight: '700', color: C.text },
  stepSub: { fontSize: 12, color: C.muted, marginTop: 2 },
  next: { backgroundColor: '#F8FAFF' },
  nextTitle: { fontSize: 14, fontWeight: '800', color: C.text },
  nextText: { fontSize: 13, color: C.muted, marginTop: 6, lineHeight: 19 },
});
