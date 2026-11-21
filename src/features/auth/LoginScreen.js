// Login Screen
import { useCallback, useContext, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { LanguagePicker, LoadingSpinner } from '../../shared/components';
import { Btn, C, topPad } from '../../shared/ui/kit';
import { AuthContext } from './AuthContext';
import { getAppleIdToken, getGoogleTicket, SocialAuthCancelled } from './socialAuth';

export const LoginScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const { signIn, signInWithProvider } = useContext(AuthContext);

  const validateForm = useCallback(() => {
    const newErrors = {};
    if (!email) newErrors.email = t('login.errorEmailRequired');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = t('login.errorEmailInvalid');
    if (!password) newErrors.password = t('login.errorPasswordRequired');
    else if (password.length < 6) newErrors.password = t('login.errorPasswordTooShort');
    return newErrors;
  }, [email, password, t]);

  const handleLogin = useCallback(async () => {
    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      await signIn(email, password);
    } catch (error) {
      Alert.alert(t('login.loginFailedTitle'), error.message);
    } finally {
      setLoading(false);
    }
  }, [email, password, signIn, validateForm, t]);

  if (loading) {
    return <LoadingSpinner message={t('login.signingIn')} />;
  }

  const socialPressed = async (provider) => {
    try {
      setLoading(true);
      const credential = provider === 'google' ? await getGoogleTicket() : await getAppleIdToken();
      await signInWithProvider(provider, credential);
    } catch (error) {
      if (!(error instanceof SocialAuthCancelled)) {
        Alert.alert(provider === 'google' ? 'Google sign-in' : 'Apple sign-in', error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <View style={styles.top}>
        <View style={styles.brandRow}>
          <Ionicons name="school" size={34} color={C.blue} />
          <Text style={styles.brand}>SchulLoop</Text>
          <View style={{ flex: 1 }} />
          <LanguagePicker variant="compact" />
        </View>
        <Text style={styles.heading}>{t('login.welcomeBack')}</Text>
        <Text style={styles.subheading}>{t('login.signInToContinue')}</Text>
      </View>

      <View style={styles.formContainer}>
        <View style={[styles.inputBox, errors.email ? styles.inputError : null]}>
          <Ionicons name="mail" size={18} color={C.muted} />
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (errors.email) setErrors({ ...errors, email: '' });
            }}
            placeholder={t('login.emailPlaceholder')}
            placeholderTextColor="#8A97AE"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}

        <View style={[styles.inputBox, { marginTop: 14 }, errors.password ? styles.inputError : null]}>
          <Ionicons name="lock-closed" size={18} color={C.muted} />
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (errors.password) setErrors({ ...errors, password: '' });
            }}
            placeholder={t('login.passwordPlaceholder')}
            placeholderTextColor="#8A97AE"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={10}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.muted} />
          </TouchableOpacity>
        </View>
        {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}

        <TouchableOpacity style={styles.forgotLink} onPress={() => navigation.navigate('PasswordRecovery')}>
          <Text style={styles.forgotText}>{t('login.forgotPassword')}</Text>
        </TouchableOpacity>

        <Btn title={t('login.signIn')} onPress={handleLogin} disabled={loading} style={styles.signInButton} />

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{t('common.or')}</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity style={styles.socialButton} activeOpacity={0.8} onPress={() => socialPressed('google')}>
          <Image source={require('../../../assets/images/google-g.png')} style={styles.googleLogo} />
          <Text style={styles.socialText}>Continue with Google</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.socialButton, { marginTop: 12 }]} activeOpacity={0.8} onPress={() => socialPressed('apple')}>
          <Ionicons name="logo-apple" size={21} color="#000" />
          <Text style={styles.socialText}>Continue with Apple</Text>
        </TouchableOpacity>

        <View style={styles.signupContainer}>
          <Text style={styles.signupText}>{t('login.noAccount')} </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
            <Text style={styles.signupLink}>{t('login.signUp')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={styles.demoButton} onPress={() => navigation.navigate('Demo')} accessibilityRole="button">
        <Ionicons name="compass" size={22} color={C.blue} style={{ marginRight: 12 }} />
        <View style={{ flex: 1 }}>
          <Text style={styles.demoButtonTitle}>Explore SchulLoop demo</Text>
          <Text style={styles.demoButtonSubtitle}>Try sample schools, student profiles, jobs, and an admin preview — no account needed.</Text>
        </View>
      </TouchableOpacity>

      <Text style={styles.disclaimer}>{t('login.disclaimer')}</Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  top: { paddingTop: topPad + 10, paddingHorizontal: 24 },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 26 },
  brand: { fontSize: 28, fontWeight: '800', color: C.blue, marginLeft: 8 },
  heading: { fontSize: 26, fontWeight: '800', color: C.text, marginBottom: 6 },
  subheading: { fontSize: 14, color: C.muted },
  formContainer: { paddingHorizontal: 24, paddingTop: 24 },
  inputBox: { flexDirection: 'row', alignItems: 'center', height: 52, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: '#fff', paddingHorizontal: 14 },
  inputError: { borderColor: C.red },
  input: { flex: 1, marginLeft: 10, fontSize: 14, color: C.text, paddingVertical: 0 },
  errorText: { color: C.red, fontSize: 12, marginTop: 4 },
  forgotLink: { alignSelf: 'flex-end', marginTop: 12, marginBottom: 18 },
  forgotText: { fontSize: 12, color: C.blue, fontWeight: '700' },
  signInButton: { height: 52, borderRadius: 10 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.border },
  dividerText: { fontSize: 12, color: C.muted, marginHorizontal: 12, fontWeight: '600' },
  socialButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 50, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: '#fff' },
  googleLogo: { width: 20, height: 20 },
  socialText: { fontSize: 14, color: C.text, fontWeight: '600', marginLeft: 10 },
  signupContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 26 },
  signupText: { fontSize: 13, color: C.muted },
  signupLink: { fontSize: 13, color: C.blue, fontWeight: '800' },
  demoButton: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 24, marginTop: 26, marginBottom: 16, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: C.blueLine, backgroundColor: C.blueSoft },
  demoButtonTitle: { color: C.blue, fontSize: 14, fontWeight: '800', marginBottom: 3 },
  demoButtonSubtitle: { color: C.muted, fontSize: 12, lineHeight: 17 },
  disclaimer: { fontSize: 11, color: C.muted, textAlign: 'center', paddingHorizontal: 24, lineHeight: 16 },
});
