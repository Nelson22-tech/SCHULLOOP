import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BlueHeader, Btn, C, Card, Chip, Field, k } from '../../shared/ui/kit';
import { STAGES, fetchJourney, saveJourney } from './journeyHelpers';

// Field definitions for the list-style sections.
const LISTS = {
  education: { title: 'Education', add: 'Add education', fields: [['institution', 'Institution', true], ['programme', 'Programme'], ['qualification', 'Qualification'], ['startYear', 'Start year', false, true], ['endYear', 'End year', false, true]] },
  qualifications: { title: 'Qualifications', add: 'Add qualification', fields: [['title', 'Title', true], ['issuer', 'Issuer'], ['year', 'Year', false, true]] },
  experience: { title: 'Experience', add: 'Add experience', fields: [['title', 'Role / title', true], ['company', 'Company'], ['startYear', 'Start year', false, true], ['endYear', 'End year', false, true], ['description', 'Description', false, false, true]] },
};
const TITLES = { skills: 'Skills & Experience', careerGoals: 'Career Progress', stage: 'Current Stage', ...Object.fromEntries(Object.entries(LISTS).map(([key, v]) => [key, v.title])) };

export const JourneyEditScreen = ({ navigation, route }) => {
  const section = route?.params?.section || 'education';
  const [journey, setJourney] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [skillText, setSkillText] = useState('');

  useEffect(() => { fetchJourney().then(setJourney).catch(e => setError(e.message || 'Could not load your journey.')); }, []);

  const update = (patch) => setJourney(j => ({ ...j, ...patch }));
  const setEntry = (key, i, field, value) => update({ [key]: journey[key].map((e, idx) => (idx === i ? { ...e, [field]: value } : e)) });
  const addEntry = (key) => update({ [key]: [...journey[key], {}] });
  const removeEntry = (key, i) => update({ [key]: journey[key].filter((_, idx) => idx !== i) });
  const addSkill = () => {
    const parts = skillText.split(',').map(x => x.trim()).filter(Boolean);
    if (parts.length) update({ skills: [...new Set([...journey.skills, ...parts])] });
    setSkillText('');
  };

  const clean = (key) => journey[key].filter(e => Object.values(e).some(v => v !== undefined && String(v).trim() !== '')).map(e => {
    const o = { ...e };
    LISTS[key].fields.forEach(([f,,,numeric]) => { if (numeric) { const n = parseInt(o[f], 10); if (o[f] === '' || o[f] === undefined || isNaN(n)) delete o[f]; else o[f] = n; } });
    return o;
  });

  const save = async () => {
    const patch = {};
    if (section === 'skills') {
      // Skills & Experience are edited together on one screen.
      const pending = skillText.split(',').map(x => x.trim()).filter(Boolean);
      patch.skills = [...new Set([...journey.skills, ...pending])];
      patch.experience = clean('experience');
    } else if (LISTS[section]) {
      const bad = clean(section).some(e => !(e[LISTS[section].fields[0][0]] || '').toString().trim());
      if (bad) return Alert.alert('Missing details', `Each entry needs a ${LISTS[section].fields[0][1].toLowerCase()}.`);
      patch[section] = clean(section);
    } else if (section === 'careerGoals') patch.careerGoals = journey.careerGoals;
    else if (section === 'stage') patch.stage = journey.stage;
    setSaving(true);
    try { await saveJourney(patch); Alert.alert('Saved', 'Your journey has been updated.'); navigation.goBack(); }
    catch (e) { Alert.alert('Could not save', e.message || 'Check your connection and try again.'); }
    setSaving(false);
  };

  const renderList = (key) => {
    const def = LISTS[key];
    return (
      <>
        {key === 'experience' ? <Text style={s.h}>Experience</Text> : null}
        {journey[key].length === 0 ? <Text style={s.empty}>Nothing added yet.</Text> : null}
        {journey[key].map((entry, i) => (
          <Card key={entry._id || `n${i}`}>
            {def.fields.map(([f, label, req, numeric, multi]) => (
              <Field key={f} label={label} required={req} value={entry[f] === undefined || entry[f] === null ? '' : String(entry[f])}
                onChangeText={v => setEntry(key, i, f, v)} keyboardType={numeric ? 'number-pad' : 'default'}
                multiline={multi} style={multi ? { } : undefined} />
            ))}
            <TouchableOpacity onPress={() => removeEntry(key, i)} style={s.remove}><Ionicons name="trash-outline" size={16} color={C.red} /><Text style={s.removeText}>Remove</Text></TouchableOpacity>
          </Card>
        ))}
        <Btn title={def.add} variant="outline" icon="add" onPress={() => addEntry(key)} style={{ marginHorizontal: 16, marginBottom: 12 }} />
      </>
    );
  };

  return (
    <View style={k.screen}>
      <BlueHeader title={TITLES[section] || 'Edit'} onBack={() => navigation.goBack()} />
      {!journey && !error ? <ActivityIndicator color={C.blue} style={{ marginTop: 40 }} /> : null}
      {error ? <Card style={{ marginTop: 16 }}><Text style={{ color: C.red }}>{error}</Text></Card> : null}
      {journey ? (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}>
            {LISTS[section] ? renderList(section) : null}

            {section === 'skills' ? (
              <>
                <Text style={s.h}>Skills</Text>
                <Card>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {journey.skills.length === 0 ? <Text style={s.empty}>No skills added yet.</Text> : null}
                    {journey.skills.map(sk => (
                      <TouchableOpacity key={sk} onPress={() => update({ skills: journey.skills.filter(x => x !== sk) })} style={s.skill}>
                        <Text style={s.skillText}>{sk}</Text><Ionicons name="close" size={14} color={C.blue} style={{ marginLeft: 4 }} />
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Field label="Add skills (comma separated)" value={skillText} onChangeText={setSkillText} onSubmitEditing={addSkill} placeholder="e.g. Figma, React, Public speaking" style={{ marginTop: 12 }} />
                  <Btn title="Add" variant="outline" onPress={addSkill} />
                </Card>
                {renderList('experience')}
              </>
            ) : null}

            {section === 'careerGoals' ? (
              <Card>
                <Field label="Career goals" value={journey.careerGoals || ''} onChangeText={v => update({ careerGoals: v })} placeholder="Where do you want to go next?" multiline textAlignVertical="top" style={{ marginBottom: 12 }} />
                <Text style={s.h2}>Current stage</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {STAGES.map(st => <Chip key={st.key} label={st.label} active={journey.stage === st.key} onPress={() => update({ stage: st.key })} style={{ marginBottom: 8 }} />)}
                </View>
              </Card>
            ) : null}

            {section === 'stage' ? (
              <Card>
                <Text style={s.empty}>Pick the stage that best describes you now. You keep every capability you have enabled.</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 }}>
                  {[{ key: 'school_seeker', label: 'School Seeker' }, ...STAGES].map(st => <Chip key={st.key} label={st.label} active={journey.stage === st.key} onPress={() => update({ stage: st.key })} style={{ marginBottom: 8 }} />)}
                </View>
              </Card>
            ) : null}

            {saving ? <ActivityIndicator color={C.blue} /> : <Btn title="Save changes" onPress={save} style={{ marginHorizontal: 16, marginTop: 4 }} />}
          </ScrollView>
        </KeyboardAvoidingView>
      ) : null}
    </View>
  );
};

const s = StyleSheet.create({
  h: { fontSize: 15, fontWeight: '800', color: C.text, marginHorizontal: 16, marginBottom: 8, marginTop: 4 },
  h2: { fontSize: 12, fontWeight: '700', color: C.text, marginBottom: 8 },
  empty: { color: C.muted, fontSize: 13, marginHorizontal: 16, marginBottom: 10 },
  remove: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end' },
  removeText: { color: C.red, fontWeight: '700', fontSize: 12, marginLeft: 4 },
  skill: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.blueSoft, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8, marginBottom: 8 },
  skillText: { color: C.blue, fontWeight: '700', fontSize: 13 },
});
