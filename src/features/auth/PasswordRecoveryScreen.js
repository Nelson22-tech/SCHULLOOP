import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Input } from '../../shared/components';
import { BlueHeader, C } from '../../shared/ui/kit';
import apiService from '../../shared/services/apiService';

export const PasswordRecoveryScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [requested, setRequested] = useState(false);
  const [loading, setLoading] = useState(false);

  const requestReset = async () => {
    setLoading(true);
    try {
      const response = await apiService.requestPasswordReset(email);
      setRequested(true);
      Alert.alert('Check your email', response.message);
    } catch (error) {
      Alert.alert('Password recovery', error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    setLoading(true);
    try {
      await apiService.resetPassword(email.trim(), code.trim(), password);
      Alert.alert('Password recovery', 'Password reset successfully');
      navigation.navigate('Login');
    } catch (error) {
      Alert.alert('Password recovery', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <BlueHeader title="Password Recovery" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Recover your account</Text>
        <Input label="Email" value={email} onChangeText={setEmail} placeholder="your@email.com" keyboardType="email-address" />
        <Button title={requested ? "Resend code" : "Send reset code"} onPress={requestReset} loading={loading} disabled={loading || !email} />
        {requested ? (
          <View style={styles.resetSection}>
            <Text style={styles.note}>Enter the 6-digit code we emailed you (check spam too), then choose a new password.</Text>
            <Input label="6-digit code" value={code} onChangeText={(v) => setCode(v.replace(/[^0-9]/g, '').slice(0, 6))} placeholder="123456" keyboardType="number-pad" />
            <Input label="New Password" value={password} onChangeText={setPassword} placeholder="At least 6 characters" secureTextEntry />
            <Button title="Reset Password" onPress={resetPassword} loading={loading} disabled={loading || code.length !== 6 || password.length < 6} />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20 },
  heading: { fontSize: 22, fontWeight: '800', color: C.text, marginBottom: 20 },
  resetSection: { marginTop: 20 },
  note: { color: C.muted, marginBottom: 12 },
});
