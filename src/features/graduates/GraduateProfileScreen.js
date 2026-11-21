import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ActivityIndicator } from 'react-native';
import { BlueHeader, Btn, C, Card, Field } from '../../shared/ui/kit';
import apiService from '../../shared/services/apiService';

const emptyEducation = () => ({ school: '', degree: '', fieldOfStudy: '', startYear: '', endYear: '' });
const emptyExperience = () => ({ title: '', company: '', location: '', startYear: '', endYear: '', current: false });

export const GraduateProfileScreen = ({ navigation }) => {
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState('');
  const [education, setEducation] = useState([emptyEducation()]);
  const [experience, setExperience] = useState([]);
  const [visibility, setVisibility] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiService.getGraduateProfile()
      .then(({ profile }) => {
        setAvatarUrl(profile.avatarUrl || '');
        setBio(profile.bio || '');
        setSkills((profile.skills || []).join(', '));
        const savedEducation = (profile.educationHistory || []).map((e) => ({
          school: e.school || '', degree: e.degree || '', fieldOfStudy: e.fieldOfStudy || '',
          startYear: e.startYear ? String(e.startYear) : '', endYear: e.endYear ? String(e.endYear) : '',
        }));
        setEducation(savedEducation.length ? savedEducation : [emptyEducation()]);
        setExperience((profile.experience || []).map((e) => ({
          title: e.title || '', company: e.company || '', location: e.location || '',
          startYear: e.startYear ? String(e.startYear) : '', endYear: e.endYear ? String(e.endYear) : '',
          current: Boolean(e.current),
        })));
        setVisibility(profile.profileVisibility !== false);
      })
      .catch((error) => Alert.alert('Profile', error.message))
      .finally(() => setLoading(false));
  }, []);

  const updateEducationField = (index, field, value) => {
    setEducation((list) => list.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };
  const updateExperienceField = (index, field, value) => {
    setExperience((list) => list.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await apiService.updateGraduateProfile({
        avatarUrl,
        bio,
        skills: skills.split(',').map((skill) => skill.trim()).filter(Boolean),
        educationHistory: education
          .filter((e) => e.school.trim())
          .map((e) => ({ ...e, startYear: e.startYear ? Number(e.startYear) : null, endYear: e.endYear ? Number(e.endYear) : null })),
        experience: experience
          .filter((e) => e.title.trim() && e.company.trim())
          .map((e) => ({ ...e, startYear: e.startYear ? Number(e.startYear) : null, endYear: e.endYear ? Number(e.endYear) : null })),
        profileVisibility: visibility,
      });
      Alert.alert('Profile', 'Profile saved successfully');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Profile', error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <View style={[styles.container, { justifyContent: 'center' }]}><ActivityIndicator color={C.blue} /></View>;

  return (
    <View style={styles.container}>
      <BlueHeader title="Edit Profile" subtitle="How other students and employers see you" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Field label="Photo URL" value={avatarUrl} onChangeText={setAvatarUrl} placeholder="https://... (optional)" />
        <Field label="Bio" value={bio} onChangeText={setBio} placeholder="Tell people about yourself" multiline />
        <Field label="Skills" value={skills} onChangeText={setSkills} placeholder="React, Research, Teaching" />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Education</Text>
          <Btn title="+ Add" variant="outline" style={styles.small} onPress={() => setEducation((list) => [...list, emptyEducation()])} />
        </View>
        {education.map((item, index) => (
          <Card key={index} style={styles.entryCard}>
            <Field label="School" value={item.school} onChangeText={(v) => updateEducationField(index, 'school', v)} placeholder="School name" />
            <Field label="Degree" value={item.degree} onChangeText={(v) => updateEducationField(index, 'degree', v)} placeholder="e.g. BSc Computer Science" />
            <Field label="Field of study" value={item.fieldOfStudy} onChangeText={(v) => updateEducationField(index, 'fieldOfStudy', v)} placeholder="Optional" />
            <View style={styles.row}>
              <Field label="Start year" value={item.startYear} onChangeText={(v) => updateEducationField(index, 'startYear', v)} placeholder="2020" keyboardType="numeric" style={styles.half} />
              <Field label="End year" value={item.endYear} onChangeText={(v) => updateEducationField(index, 'endYear', v)} placeholder="2024" keyboardType="numeric" style={styles.half} />
            </View>
            {education.length > 1 ? (
              <Btn title="Remove" variant="outline" style={styles.small} onPress={() => setEducation((list) => list.filter((_, i) => i !== index))} />
            ) : null}
          </Card>
        ))}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Experience</Text>
          <Btn title="+ Add" variant="outline" style={styles.small} onPress={() => setExperience((list) => [...list, emptyExperience()])} />
        </View>
        {experience.length === 0 ? (
          <Text style={styles.emptyHint}>No experience added yet.</Text>
        ) : (
          experience.map((item, index) => (
            <Card key={index} style={styles.entryCard}>
              <Field label="Title" value={item.title} onChangeText={(v) => updateExperienceField(index, 'title', v)} placeholder="e.g. Intern" />
              <Field label="Company" value={item.company} onChangeText={(v) => updateExperienceField(index, 'company', v)} placeholder="Company name" />
              <Field label="Location" value={item.location} onChangeText={(v) => updateExperienceField(index, 'location', v)} placeholder="Optional" />
              <View style={styles.row}>
                <Field label="Start year" value={item.startYear} onChangeText={(v) => updateExperienceField(index, 'startYear', v)} placeholder="2023" keyboardType="numeric" style={styles.half} />
                <Field label="End year" value={item.endYear} onChangeText={(v) => updateExperienceField(index, 'endYear', v)} placeholder="Present" keyboardType="numeric" style={styles.half} editable={!item.current} />
              </View>
              <Btn
                title={item.current ? 'Currently working here' : 'Mark as current role'}
                variant="outline"
                style={styles.small}
                onPress={() => updateExperienceField(index, 'current', !item.current)}
              />
              <Btn title="Remove" variant="outline" style={styles.small} onPress={() => setExperience((list) => list.filter((_, i) => i !== index))} />
            </Card>
          ))
        )}

        <Btn title={visibility ? 'Profile Visible' : 'Profile Hidden'} variant="outline" icon={visibility ? 'eye-outline' : 'eye-off-outline'} onPress={() => setVisibility((value) => !value)} />
        <Btn title={saving ? 'Saving...' : 'Save Profile'} onPress={saveProfile} disabled={saving} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, gap: 10 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: C.text },
  small: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10 },
  entryCard: { marginHorizontal: 0, padding: 14, gap: 8 },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  emptyHint: { color: C.muted, fontStyle: 'italic' },
});
