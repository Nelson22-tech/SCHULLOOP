import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { BlueHeader, Btn, C, Field } from '../../shared/ui/kit';
import apiService from '../../shared/services/apiService';

const FIELDS = [
  ['title', 'Job title', 'e.g. Junior Web Developer'],
  ['company', 'Company', 'Company name'],
  ['location', 'Location', 'City, country or Remote'],
  ['salary', 'Salary range', 'Optional'],
  ['jobType', 'Job type', 'Full-time / Internship / Part-time / Contract'],
  ['skills', 'Required skills', 'JavaScript, React, Git'],
  ['description', 'Description', 'Responsibilities, requirements and application details'],
];

export const PostJobScreen = ({ navigation }) => {
  const [form, setForm] = useState({ title: '', company: '', location: '', salary: '', jobType: 'Full-time', skills: '', description: '' });
  const [saving, setSaving] = useState(false);
  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const submit = async () => {
    if (!form.title.trim() || !form.company.trim() || !form.location.trim()) { Alert.alert('Post job', 'Title, company and location are required.'); return; }
    setSaving(true);
    try {
      await apiService.createJob({ ...form, skills: form.skills.split(',').map(x => x.trim()).filter(Boolean) });
      Alert.alert('Job posted', 'Your opportunity is now visible to students.');
      navigation.goBack();
    } catch (e) { Alert.alert('Post job', e.message); }
    finally { setSaving(false); }
  };

  return (
    <View style={s.container}>
      <BlueHeader title="Post a Job" subtitle="Reach students and graduates" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={s.content}>
        {FIELDS.map(([key, label, placeholder]) => (
          <Field
            key={key}
            label={label}
            value={form[key]}
            onChangeText={v => set(key, v)}
            placeholder={placeholder}
            multiline={key === 'description'}
            {...(key === 'description' ? { textAlignVertical: 'top' } : {})}
          />
        ))}
        <Btn title={saving ? 'Publishing...' : 'Publish Opportunity'} onPress={submit} disabled={saving} />
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, paddingBottom: 40 },
});
