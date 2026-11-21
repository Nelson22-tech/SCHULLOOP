import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useContext, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BlueHeader, Btn, C, Card, Field } from '../../shared/ui/kit';
import apiService from '../../shared/services/apiService';
import { AuthContext } from '../auth/AuthContext';
import { CompanyLogo, getJobId, jobLocation, jobTypeLabel } from './jobHelpers';

const sizeLabel = bytes => (bytes ? `${(bytes / 1048576).toFixed(1)} MB` : '');

export const ApplyJobScreen = ({ navigation, route }) => {
  const job = route?.params?.job || {};
  const { user } = useContext(AuthContext);
  const [name, setName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [resume, setResume] = useState(null);
  const [busy, setBusy] = useState(false);

  const pick = async () => {
    try {
      const r = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });
      if (!r.canceled) setResume(r.assets[0]);
    } catch (e) { Alert.alert('Resume', e.message); }
  };

  const submit = async () => {
    if (!name.trim() || !email.trim()) { Alert.alert('Apply', 'Full name and email are required.'); return; }
    if (job.sample) { Alert.alert('Sample listing', 'This is a sample job shown for preview. Real jobs can be applied to once employers post them.'); return; }
    setBusy(true);
    try {
      if (resume) {
        try {
          const uploaded = await apiService.uploadFile(resume.uri, resume.name, resume.mimeType || 'application/octet-stream');
          await apiService.createCareerDocument({ title: resume.name, category: 'cv', url: uploaded.url, mimeType: resume.mimeType, sizeBytes: resume.size || 0, visibility: 'employers' });
        } catch (e) { /* resume upload is best-effort; the application still goes through */ }
      }
      await apiService.applyForJob(getJobId(job));
      Alert.alert('Application', 'Application submitted successfully.');
      navigation.navigate('MyJobApplications');
    } catch (e) { Alert.alert('Application', e.message); }
    finally { setBusy(false); }
  };

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <BlueHeader title="Apply for Job" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ paddingTop: 16, paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
        <Card style={{ flexDirection: 'row', alignItems: 'center' }}>
          <CompanyLogo job={job} size={56} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={s.title}>{job.title}</Text>
            <Text style={s.company}>{job.company}</Text>
            {job.salary ? <Text style={s.meta}>{job.salary}</Text> : null}
            <Text style={s.meta}>{jobLocation(job)}  •  {jobTypeLabel(job)}</Text>
          </View>
        </Card>
        <Text style={s.section}>Your Information</Text>
        <View style={{ paddingHorizontal: 16 }}>
          <Field label="Full Name" value={name} onChangeText={setName} placeholder="Full name" />
          <Field label="Email Address" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
          <Field label="Phone Number" value={phone} onChangeText={setPhone} placeholder="+1 202 555 0189" keyboardType="phone-pad" />
          <Text style={s.label}>Resume (PDF, DOC, DOCX)</Text>
          <TouchableOpacity style={s.file} onPress={pick} activeOpacity={0.8}>
            <Ionicons name={resume ? 'attach' : 'cloud-upload-outline'} size={22} color={C.blue} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={s.fileName} numberOfLines={1}>{resume ? resume.name : 'Choose a file'}</Text>
              {resume ? <Text style={s.meta}>{sizeLabel(resume.size)}</Text> : null}
            </View>
            {resume ? <TouchableOpacity onPress={() => setResume(null)} hitSlop={10}><Ionicons name="close" size={20} color={C.muted} /></TouchableOpacity> : null}
          </TouchableOpacity>
          <Btn title={busy ? 'Submitting...' : 'Submit Application'} onPress={submit} disabled={busy} style={{ marginTop: 22 }} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  title: { fontSize: 16, fontWeight: '800', color: C.text },
  company: { fontSize: 13, color: C.muted, marginTop: 2 },
  meta: { fontSize: 12, color: C.muted, marginTop: 3 },
  section: { fontSize: 16, fontWeight: '800', color: C.text, paddingHorizontal: 16, marginTop: 8, marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '700', color: C.text, marginBottom: 6 },
  file: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.blueSoft, borderWidth: 1, borderColor: C.blueLine, borderRadius: 12, padding: 14 },
  fileName: { fontSize: 13, fontWeight: '700', color: C.text },
});
