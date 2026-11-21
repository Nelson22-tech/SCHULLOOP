// Sign Up Screen
import { useContext, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LanguagePicker, LoadingSpinner } from '../../shared/components';
import { BlueHeader, Btn, C } from '../../shared/ui/kit';
import { AuthContext } from './AuthContext';
import { API_BASE_URL } from '../../shared/config/api';

const AuthInput = ({ label, icon, error, ...props }) => (
  <View style={{ marginBottom: 14 }}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <View style={[styles.inputBox, error ? { borderColor: C.red } : null]}>
      <Ionicons name={icon} size={18} color={C.muted} />
      <TextInput style={styles.inputText} placeholderTextColor="#8A97AE" autoCapitalize="none" {...props} />
    </View>
    {error ? <Text style={styles.errorText}>{error}</Text> : null}
  </View>
);

export const SignupScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    userType: 'student',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const { signUp } = useContext(AuthContext);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.fullName) newErrors.fullName = 'Name is required';
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      newErrors.email = 'Invalid email';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6)
      newErrors.password = 'Password must be at least 6 characters';
    if (formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = 'Passwords do not match';
    return newErrors;
  };

  const handleSignup = async () => {
    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    setLoading(true);
    setErrors({});
    try {
      await signUp({
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        userType: formData.userType,
      });
    } catch (error) {
      const message = /Failed to fetch|Network request failed|Network Error/i.test(error?.message || '')
        ? `Cannot connect to the SchulLoop server. Make sure the backend is running on your computer and your phone/computer are on the same network.\n\nAPI: ${API_BASE_URL}`
        : (error?.message || 'Unable to create your account. Please try again.');
      Alert.alert('Sign up Failed', message);
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field, value) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) setErrors({ ...errors, [field]: '' });
  };

  if (loading) {
    return <LoadingSpinner message="Creating account..." />;
  }

  return (
    <View style={styles.container}>
      <BlueHeader
        title="Create Account"
        subtitle="Join Global School Finder"
        onBack={() => navigation.goBack()}
        right={<LanguagePicker variant="compact" />}
      />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.formContainer}>
          <AuthInput
            label="Full Name *"
            icon="person"
            value={formData.fullName}
            onChangeText={(val) => updateField('fullName', val)}
            placeholder="Enter your full name"
            error={errors.fullName}
          />

          <AuthInput
            label="Email *"
            icon="mail"
            value={formData.email}
            onChangeText={(val) => updateField('email', val)}
            placeholder="your@email.com"
            keyboardType="email-address"
            error={errors.email}
          />

          <AuthInput
            label="Phone Number"
            icon="call"
            value={formData.phone}
            onChangeText={(val) => updateField('phone', val)}
            placeholder="Enter your phone number"
            keyboardType="phone-pad"
          />

          <Text style={styles.accountTypeLabel}>I am joining as</Text>
          <View style={styles.accountTypeRow}>
            {[['student', 'Student'], ['graduate', 'Graduate'], ['school', 'School'], ['employer', 'Employer']].map(([value, label]) => (
              <Text key={value} onPress={() => updateField('userType', value)} style={[styles.accountTypeOption, formData.userType === value && styles.accountTypeOptionActive]}>{label}</Text>
            ))}
          </View>

          <AuthInput
            label="Password *"
            icon="lock-closed"
            value={formData.password}
            onChangeText={(val) => updateField('password', val)}
            placeholder="Create a password"
            secureTextEntry
            error={errors.password}
          />

          <AuthInput
            label="Confirm Password *"
            icon="lock-closed"
            value={formData.confirmPassword}
            onChangeText={(val) => updateField('confirmPassword', val)}
            placeholder="Confirm your password"
            secureTextEntry
            error={errors.confirmPassword}
          />

          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              By signing up, you agree to our Terms of Service and Privacy Policy
            </Text>
          </View>

          <Btn title="Create Account" onPress={handleSignup} disabled={loading} style={styles.signupButton} />

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <Text
              style={styles.loginLink}
              onPress={() => navigation.navigate('Login')}
            >
              Sign In
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  formContainer: { paddingHorizontal: 20, paddingVertical: 24 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: C.text, marginBottom: 6 },
  inputBox: { flexDirection: 'row', alignItems: 'center', height: 50, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: '#fff', paddingHorizontal: 14 },
  inputText: { flex: 1, marginLeft: 10, fontSize: 14, color: C.text, paddingVertical: 0 },
  errorText: { color: C.red, fontSize: 12, marginTop: 4 },
  accountTypeLabel: { fontSize: 12, fontWeight: '700', color: C.text, marginTop: 4, marginBottom: 9 },
  accountTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  accountTypeOption: { overflow: 'hidden', borderRadius: 20, backgroundColor: C.blueSoft, color: C.blue, paddingHorizontal: 16, paddingVertical: 8, fontSize: 13, fontWeight: '700' },
  accountTypeOptionActive: { backgroundColor: C.blue, color: '#fff' },
  termsContainer: { marginVertical: 14 },
  termsText: { fontSize: 12, color: C.muted, textAlign: 'center', lineHeight: 16 },
  signupButton: { height: 52, borderRadius: 10, marginTop: 4 },
  loginContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  loginText: { fontSize: 13, color: C.muted },
  loginLink: { fontSize: 13, color: C.blue, fontWeight: '800' },
});
