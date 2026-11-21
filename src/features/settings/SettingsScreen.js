import { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LanguagePicker } from '../../shared/components';
import { BlueHeader, C, Card, Chip, Initials, ListRow, SectionTitle } from '../../shared/ui/kit';
import { AuthContext } from '../auth/AuthContext';
import { useTheme } from '../../shared/theme/ThemeContext';

export const SettingsScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { user, signOut } = useContext(AuthContext);
  const { mode, setThemeMode } = useTheme();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      Alert.alert(t('settings.signOut'), error.message);
    }
  };

  const canGoBack = navigation.canGoBack && navigation.canGoBack();

  return (
    <View style={styles.container}>
      <BlueHeader title={t('settings.title')} subtitle={t('settings.subtitle')} onBack={canGoBack ? () => navigation.goBack() : undefined} />
      <ScrollView contentContainerStyle={{ paddingTop: 16, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
        <Card style={styles.profile}>
          <Initials name={user?.fullName || user?.email || '?'} size={52} />
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.name} numberOfLines={1}>{user?.fullName}</Text>
            <Text style={styles.email} numberOfLines={1}>{user?.email}</Text>
            <Text style={styles.role}>{(user?.userType || 'User').replace(/_/g, ' ')}</Text>
          </View>
        </Card>

        <SectionTitle title="Preferences" />
        <Card style={styles.group}>
          <LanguagePicker />
          <Text style={styles.label}>Appearance</Text>
          <View style={styles.chips}>
            {['system', 'light', 'dark'].map((v) => (
              <Chip key={v} label={v === mode ? `✓ ${v}` : v} active={v === mode} onPress={() => setThemeMode(v)} />
            ))}
          </View>
        </Card>

        <SectionTitle title="More" />
        <Card style={styles.group}>
          <ListRow icon="document-attach-outline" title="Career documents" onPress={() => navigation.navigate('CareerDocuments')} />
          <ListRow icon="calendar-outline" title="Interviews" onPress={() => navigation.navigate('Interviews')} />
          <ListRow icon="notifications-outline" title="Notifications" onPress={() => navigation.navigate('Notifications')} />
          <ListRow icon="key-outline" title="Password Recovery" onPress={() => navigation.navigate('PasswordRecovery')} last />
        </Card>

        <TouchableOpacity activeOpacity={0.85} style={styles.signOut} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={20} color={C.red} style={{ marginRight: 8 }} />
          <Text style={styles.signOutText}>{t('settings.signOut')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  profile: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: 17, fontWeight: '800', color: C.text },
  email: { color: C.muted, fontSize: 13, marginTop: 3 },
  role: { color: C.blue, fontSize: 12, fontWeight: '700', marginTop: 5, textTransform: 'capitalize' },
  group: { paddingVertical: 6 },
  label: { fontSize: 12, fontWeight: '700', color: C.text, marginTop: 14, marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', paddingBottom: 6 },
  signOut: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: C.redSoft, borderRadius: 12, paddingVertical: 14, marginHorizontal: 16, marginTop: 6 },
  signOutText: { color: C.red, fontWeight: '800', fontSize: 15 },
});
