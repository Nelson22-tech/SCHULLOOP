import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlueHeader, Btn, C, Field, SectionTitle, shadow } from '../../shared/ui/kit';
import apiService from '../../shared/services/apiService';

const TYPE_OPTIONS = [
  { value: 'class', label: 'Class', hint: 'A cohort or year group, e.g. "Class of 2027"' },
  { value: 'club', label: 'Club', hint: 'A society or interest group, e.g. "Debate Club"' },
  { value: 'study', label: 'Study group', hint: 'A smaller, subject-focused group' },
  { value: 'announcements', label: 'Announcements', hint: 'One-way: only you can post; members read' },
  { value: 'alumni', label: 'Alumni', hint: "This school's own graduates" },
];

export const CreateGroupScreen = ({ route, navigation }) => {
  const { schoolId, schoolName } = route.params || {};
  const [type, setType] = useState('club');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const create = async () => {
    if (!name.trim()) {
      Alert.alert('Create Group', 'A group name is required');
      return;
    }
    setSaving(true);
    try {
      await apiService.createSchoolGroup(schoolId, { name: name.trim(), description: description.trim(), type });
      Alert.alert('Create Group', 'Group created');
      navigation.replace('SchoolGroups', { schoolId, schoolName });
    } catch (error) {
      Alert.alert('Create Group', error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <BlueHeader title="Create a Group" subtitle={schoolName} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <SectionTitle title="Type" style={{ paddingHorizontal: 0 }} />
        {TYPE_OPTIONS.map((option) => {
          const selected = type === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              activeOpacity={0.85}
              style={[styles.typeOption, selected && styles.typeOptionSelected]}
              onPress={() => setType(option.value)}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.typeLabel, selected && styles.typeLabelSelected]}>{option.label}</Text>
                <Text style={styles.typeHint}>{option.hint}</Text>
              </View>
              <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={22} color={selected ? C.blue : C.muted} />
            </TouchableOpacity>
          );
        })}

        <View style={styles.form}>
          <Field label="Group name" value={name} onChangeText={setName} placeholder="e.g. Class of 2027" />
          <Field
            label="Description"
            value={description}
            onChangeText={setDescription}
            placeholder="What is this group for?"
            multiline
            style={{ marginBottom: 4 }}
            textAlignVertical="top"
          />
        </View>

        <Btn title={saving ? 'Creating...' : 'Create Group'} onPress={create} disabled={saving} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, paddingBottom: 32 },
  typeOption: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 14,
    marginBottom: 10, backgroundColor: '#fff', ...shadow,
  },
  typeOptionSelected: { borderColor: C.blue, borderWidth: 2, backgroundColor: C.blueSoft },
  typeLabel: { fontSize: 15, fontWeight: '800', color: C.text },
  typeLabelSelected: { color: C.blue },
  typeHint: { fontSize: 12, color: C.muted, marginTop: 2 },
  form: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginTop: 6, marginBottom: 16, borderWidth: 1, borderColor: C.border, ...shadow },
});
