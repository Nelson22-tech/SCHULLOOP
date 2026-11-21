import { useContext, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Btn, C, Card, Field, Stepper, topPad } from '../../shared/ui/kit';
import { AuthContext } from '../auth/AuthContext';
import apiService from '../../shared/services/apiService';

const STEPS = ['Personal Info', 'Program', 'Review'];

export const AdmissionApplicationScreen = ({ navigation, route }) => {
  const { schoolId, schoolName } = route.params || {};
  const { user } = useContext(AuthContext) || {};
  const [step, setStep] = useState(0);

  // Step 1: personal information (prefilled from the signed-in account)
  const [fullName, setFullName] = useState(user?.fullName || user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [phone, setPhone] = useState(user?.phone || '');

  // Step 2: programme details (existing fields)
  const [program, setProgram] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [personalStatement, setPersonalStatement] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const title = `Apply to ${schoolName || 'School'}`;

  const goBack = () => {
    if (step > 0) setStep(step - 1);
    else navigation.goBack();
  };

  const nextFromPersonal = () => {
    if (!fullName.trim() || !email.trim()) {
      Alert.alert('Missing information', 'Enter your full name and email address to continue.');
      return;
    }
    setStep(1);
  };

  const nextFromProgram = () => {
    if (!program.trim() || !academicYear.trim()) {
      Alert.alert('Missing information', 'Enter the programme and academic year before submitting.');
      return;
    }
    setStep(2);
  };

  const submitApplication = async () => {
    if (!program.trim() || !academicYear.trim()) {
      Alert.alert('Missing information', 'Enter the programme and academic year before submitting.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await apiService.request(`/schools/${schoolId}/admissions`, 'POST', {
        program: program.trim(),
        academicYear: academicYear.trim(),
        personalStatement: personalStatement.trim(),
        applicant: { fullName: fullName.trim(), email: email.trim(), dateOfBirth: dateOfBirth.trim(), phone: phone.trim() },
      });
      const confirmation = {
        ...result.confirmation,
        applicationId: result.application?._id,
        submittedAt: result.application?.submittedAt || new Date().toISOString(),
        schoolId,
        schoolName: schoolName || 'Selected school',
        program: program.trim(),
        academicYear: academicYear.trim(),
      };
      setProgram(''); setAcademicYear(''); setPersonalStatement('');
      navigation.navigate('ApplicationConfirmation', { confirmation });
    } catch (error) {
      Alert.alert('Could not submit application', error.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const reviewRows = [
    ['Full name', fullName],
    ['Email', email],
    ['Date of birth', dateOfBirth],
    ['Phone', phone],
    ['School', schoolName || 'Selected school'],
    ['Programme', program],
    ['Academic year', academicYear],
  ];

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} hitSlop={12} style={{ marginRight: 12 }}>
          <Ionicons name="arrow-back" size={22} color={C.blue} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
      </View>
      <Stepper steps={STEPS} current={step} />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {step === 0 ? (
          <View>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            <Field label="Full Name" required value={fullName} onChangeText={setFullName} placeholder="Your full name" />
            <Field label="Email Address" required value={email} onChangeText={setEmail} placeholder="you@email.com" keyboardType="email-address" autoCapitalize="none" />
            <Field label="Date of Birth" value={dateOfBirth} onChangeText={setDateOfBirth} placeholder="YYYY-MM-DD" maxLength={10} />
            <Field label="Phone Number" value={phone} onChangeText={setPhone} placeholder="+1 234 567 8900" keyboardType="phone-pad" />
            <Btn title="Next" onPress={nextFromPersonal} />
          </View>
        ) : null}

        {step === 1 ? (
          <View>
            <Text style={styles.sectionTitle}>Programme Details</Text>
            <Text style={styles.helper}>Submit an application and receive a unique application confirmation number.</Text>
            <Field label="Programme / course" required value={program} onChangeText={setProgram} placeholder="e.g. Computer Science" maxLength={160} />
            <Field label="Academic year" required value={academicYear} onChangeText={setAcademicYear} placeholder="e.g. 2027–2028" maxLength={40} />
            <Text style={styles.label}>Personal statement (optional)</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              value={personalStatement}
              onChangeText={setPersonalStatement}
              placeholder="Tell the school briefly about your application"
              placeholderTextColor="#9AA6BC"
              multiline
              maxLength={3000}
            />
            <Btn title="Next" onPress={nextFromProgram} style={{ marginTop: 18 }} />
          </View>
        ) : null}

        {step === 2 ? (
          <View>
            <Text style={styles.sectionTitle}>Review & Submit</Text>
            <Card style={styles.reviewCard}>
              {reviewRows.map(([label, value], index) => (
                <View key={label} style={[styles.reviewRow, index > 0 && styles.reviewBorder]}>
                  <Text style={styles.reviewLabel}>{label}</Text>
                  <Text style={styles.reviewValue}>{value || '—'}</Text>
                </View>
              ))}
              {personalStatement.trim() ? (
                <View style={[styles.reviewBorder, { paddingTop: 10 }]}>
                  <Text style={styles.reviewLabel}>Personal statement</Text>
                  <Text style={[styles.reviewValue, { textAlign: 'left', maxWidth: '100%', marginTop: 4 }]}>{personalStatement.trim()}</Text>
                </View>
              ) : null}
            </Card>
            <Text style={styles.notice}>
              Submitting an application does not mean you have been admitted. Any required application fee is handled separately, and a payment receipt is created only after payment verification.
            </Text>
            <Btn title={submitting ? 'Submitting…' : 'Submit Application'} onPress={submitApplication} disabled={submitting} />
            <TouchableOpacity onPress={() => navigation.navigate('MyApplications')} style={styles.linkWrap}>
              <Text style={styles.link}>View my admission applications</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: topPad, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: '#fff' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '800', color: C.blue },
  content: { padding: 16, paddingBottom: 36 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: C.text, marginBottom: 14 },
  helper: { color: C.muted, fontSize: 13, lineHeight: 19, marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '700', color: C.text, marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, paddingTop: 12, fontSize: 14, color: C.text },
  multiline: { minHeight: 110, textAlignVertical: 'top' },
  reviewCard: { marginHorizontal: 0, padding: 14 },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
  reviewBorder: { borderTopWidth: 1, borderTopColor: '#EDF2FA' },
  reviewLabel: { fontSize: 12, color: C.muted },
  reviewValue: { fontSize: 13, fontWeight: '700', color: C.text, maxWidth: '62%', textAlign: 'right' },
  notice: { color: '#795d18', backgroundColor: '#fff7df', padding: 12, borderRadius: 10, marginBottom: 16, lineHeight: 19, fontSize: 12 },
  linkWrap: { alignItems: 'center', paddingVertical: 16 },
  link: { color: C.blue, fontWeight: '700', fontSize: 13 },
});
