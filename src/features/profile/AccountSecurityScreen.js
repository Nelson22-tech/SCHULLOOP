import { Ionicons } from '@expo/vector-icons';
import { useContext } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BlueHeader, C, Card, ListRow, MAIN_BAR, ModuleBar, k } from '../../shared/ui/kit';
import { AuthContext } from '../auth/AuthContext';

export const AccountSecurityScreen = ({ navigation }) => {
  const auth = useContext(AuthContext) || {};
  const user = auth.user || {};

  const signOut = async () => {
    try {
      if (typeof auth.signOut === 'function') await auth.signOut();
    } catch (e) { Alert.alert('Sign out', e.message || 'Could not sign out.'); }
  };

  return (
    <View style={k.screen}>
      <BlueHeader title="Account Security" subtitle="Sign-in and data protection" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ paddingTop: 16, paddingBottom: 28 }}>
        <Card style={{ paddingVertical: 2, paddingHorizontal: 14 }}>
          <ListRow icon="mail" title="Email" subtitle={user.email || 'Not available'} />
          <ListRow icon="checkmark-circle" title="Sign-in status" subtitle={user.email ? 'Signed in on this device' : 'Not signed in'} />
          <ListRow icon="key" title="Change password" subtitle="Reset your password by email" onPress={() => navigation.navigate('PasswordRecovery')} />
          <ListRow icon="log-out" title="Sign out" onPress={signOut} last right={<Ionicons name="chevron-forward" size={18} color={C.red} />} />
        </Card>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <Ionicons name="shield-checkmark" size={20} color={C.blue} />
            <Text style={s.title}>How we protect your data</Text>
          </View>
          <Text style={s.text}>Your personal information is used only to provide SchulLoop services. You control who sees your profile in Profile and Privacy, and you should never share your password with anyone.</Text>
        </Card>
      </ScrollView>
      <ModuleBar items={MAIN_BAR} active="profile" navigation={navigation} />
    </View>
  );
};

const s = StyleSheet.create({
  title: { fontSize: 15, fontWeight: '800', color: C.text, marginLeft: 8 },
  text: { fontSize: 13, color: C.muted, lineHeight: 19 },
});
