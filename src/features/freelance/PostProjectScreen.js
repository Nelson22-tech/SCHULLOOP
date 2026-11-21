import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BlueHeader, Btn, C, Chip, Field } from '../../shared/ui/kit';
import { CATEGORIES, api } from './freelanceApi';

export const PostProjectScreen = ({ navigation }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [skills, setSkills] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [budgetType, setBudgetType] = useState('fixed');
  const [duration, setDuration] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const min = Number(budgetMin);
    const max = Number(budgetMax);
    if (title.trim().length < 5) return Alert.alert('Title too short', 'Give your project a clear title (at least 5 characters).');
    if (description.trim().length < 20) return Alert.alert('Description too short', 'Describe the work in at least 20 characters.');
    if (!category) return Alert.alert('Choose a category', 'Pick the category that fits your project best.');
    if (!(min > 0) || !(max > 0)) return Alert.alert('Budget needed', 'Enter a minimum and maximum budget greater than 0.');
    if (max < min) return Alert.alert('Check budget', 'Maximum budget must be at least the minimum.');
    setBusy(true);
    try {
      const { project } = await api('/projects', 'POST', {
        title: title.trim(), description: description.trim(), category,
        skills: skills.split(',').map(x => x.trim()).filter(Boolean),
        budgetMin: min, budgetMax: max, budgetType, duration: duration.trim(),
      });
      navigation.replace('ProjectDetail', { projectId: project._id });
    } catch (e) { Alert.alert('Could not post project', e.message); }
    finally { setBusy(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <BlueHeader title="Post a Project" onBack={() => navigation.goBack()} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Field label="Project title" required value={title} onChangeText={setTitle} placeholder="e.g. Design a logo for my shop" />
        <Field label="Description" required value={description} onChangeText={setDescription} multiline placeholder="What needs to be done?" style={{ marginBottom: 14 }} />
        <Text style={s.label}>Category <Text style={{ color: C.red }}>*</Text></Text>
        <View style={s.wrap}>{CATEGORIES.map(c => <Chip key={c} label={c} active={category === c} onPress={() => setCategory(c)} style={{ marginBottom: 8 }} />)}</View>
        <Field label="Required skills (comma separated)" value={skills} onChangeText={setSkills} placeholder="Figma, Illustrator" />
        <Text style={s.label}>Budget type</Text>
        <View style={s.wrap}>
          <Chip label="Fixed price" active={budgetType === 'fixed'} onPress={() => setBudgetType('fixed')} />
          <Chip label="Hourly" active={budgetType === 'hourly'} onPress={() => setBudgetType('hourly')} />
        </View>
        <View style={{ flexDirection: 'row' }}>
          <Field label="Budget min ($)" required value={budgetMin} onChangeText={setBudgetMin} keyboardType="numeric" placeholder="100" style={{ flex: 1, marginRight: 8 }} />
          <Field label="Budget max ($)" required value={budgetMax} onChangeText={setBudgetMax} keyboardType="numeric" placeholder="300" style={{ flex: 1, marginLeft: 8 }} />
        </View>
        <Field label="Duration" value={duration} onChangeText={setDuration} placeholder="e.g. 5 days, 2 weeks" />
        <View style={s.note}>
          <Ionicons name="information-circle" size={18} color={C.blue} />
          <Text style={s.noteText}>Payments are arranged directly between the client and the freelancer. SchulLoop does not hold funds.</Text>
        </View>
        <Btn title={busy ? 'Posting...' : 'Post project'} onPress={submit} disabled={busy} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const s = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '700', color: C.text, marginBottom: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  note: { flexDirection: 'row', backgroundColor: C.blueSoft, borderRadius: 12, padding: 12, marginBottom: 16, alignItems: 'flex-start' },
  noteText: { flex: 1, marginLeft: 8, color: C.text, fontSize: 12, lineHeight: 17 },
});
