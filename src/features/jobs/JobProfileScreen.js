import { Ionicons } from '@expo/vector-icons';
import { useContext } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BlueHeader, Btn, C, Initials, JOB_BAR, ModuleBar } from '../../shared/ui/kit';
import { AuthContext } from '../auth/AuthContext';

export const JobProfileScreen = ({ navigation }) => {
  const { user, signOut } = useContext(AuthContext);

  const rows = [
    { icon: 'person-outline', label: 'Edit Profile', onPress: () => navigation.navigate('GraduateProfile') },
    { icon: 'lock-closed-outline', label: 'Change Password', onPress: () => navigation.navigate('PasswordRecovery') },
    { icon: 'notifications-outline', label: 'Notifications', onPress: () => navigation.navigate('Notifications') },
    { icon: 'globe-outline', label: 'Language', onPress: () => Alert.alert('Language', 'English is currently the only supported language.') },
    { icon: 'help-circle-outline', label: 'Help & Support', onPress: () => Alert.alert('Help & Support', 'Need help? Contact support@schulloop.com.') },
    { icon: 'shield-checkmark-outline', label: 'Privacy Policy', onPress: () => Alert.alert('Privacy Policy', 'Your data is used only to run your SchulLoop account and job applications.') },
    { icon: 'document-text-outline', label: 'Terms of Service', onPress: () => Alert.alert('Terms of Service', 'By using SchulLoop you agree to our terms of service.') },
  ];

  return (
    <View style={s.root}>
      <BlueHeader title="" style={{ paddingBottom: 22 }}
        right={<TouchableOpacity onPress={() => navigation.navigate('Settings')} hitSlop={10}><Ionicons name="settings-outline" size={22} color="#fff" /></TouchableOpacity>}>
        <View style={s.profile}>
          {user?.avatarUrl
            ? <Image source={{ uri: user.avatarUrl }} style={s.avatar} />
            : <Initials name={user?.fullName || 'User'} size={64} bg={C.blueDark} />}
          <View style={{ marginLeft: 14, flex: 1 }}>
            <Text style={s.name}>{user?.fullName || 'Your name'}</Text>
            <Text style={s.email}>{user?.email}</Text>
          </View>
        </View>
      </BlueHeader>
      <ScrollView style={s.sheet} contentContainerStyle={{ paddingBottom: 24 }}>
        {rows.map(r => (
          <TouchableOpacity key={r.label} style={s.row} onPress={r.onPress}>
            <Ionicons name={r.icon} size={20} color={C.text} style={{ width: 32 }} />
            <Text style={s.rowText}>{r.label}</Text>
            <Ionicons name="chevron-forward" size={18} color={C.muted} />
          </TouchableOpacity>
        ))}
        <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
          <Btn title="Logout" onPress={() => signOut()} />
        </View>
      </ScrollView>
      <ModuleBar items={JOB_BAR} active="profile" navigation={navigation} />
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  profile: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: C.blueDark },
  name: { color: '#fff', fontSize: 20, fontWeight: '800' },
  email: { color: '#D6E5FF', fontSize: 13, marginTop: 3 },
  sheet: { flex: 1, backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, marginTop: -10 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#EDF2FA' },
  rowText: { flex: 1, fontSize: 14.5, color: C.text, fontWeight: '600' },
});
