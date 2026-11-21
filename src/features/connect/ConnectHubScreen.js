import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BlueHeader, Btn, C, Card, IconBtn, IconTile, ListRow, SectionTitle, k } from '../../shared/ui/kit';

const SEGMENTS = [
  {
    key: 'friends', label: 'Friends', icon: 'people', color: C.purple, bg: C.purpleSoft,
    title: 'Friends & Connections', text: 'Find students, mentors and peers, view their profiles and build your network.',
    cta: 'Open Student Connect', route: 'StudentConnect',
    shortcuts: [{ icon: 'search', title: 'Find people', route: 'StudentConnect' }, { icon: 'person-circle', title: 'My profile', route: 'StudentProfile' }],
  },
  {
    key: 'community', label: 'Community', icon: 'chatbubbles', color: C.green, bg: C.greenSoft,
    title: 'Student Community', text: 'Join communities and school groups to share ideas and get answers.',
    cta: 'Browse communities', route: 'Communities',
    shortcuts: [{ icon: 'school', title: 'School groups', route: 'SchoolGroups' }, { icon: 'add-circle', title: 'Create a group', route: 'CreateGroup' }],
  },
  {
    key: 'messages', label: 'Messages', icon: 'mail', color: C.blue, bg: C.blueSoft,
    title: 'Messages', text: 'Continue your conversations with students, schools and employers.',
    cta: 'Open messages', route: 'Messages',
    shortcuts: [{ icon: 'briefcase', title: 'Job messages', route: 'JobMessages' }, { icon: 'notifications', title: 'Notifications', route: 'Notifications' }],
  },
];

export const ConnectHubScreen = ({ navigation }) => {
  const [active, setActive] = useState('friends');
  const seg = SEGMENTS.find(x => x.key === active);

  return (
    <View style={k.screen}>
      <BlueHeader title="Connect" subtitle="Friends, communities and messages"
        right={<IconBtn name="notifications-outline" onPress={() => navigation.navigate('Notifications')} />}>
        <View style={s.segment}>
          {SEGMENTS.map(x => (
            <TouchableOpacity key={x.key} onPress={() => setActive(x.key)} style={[s.segBtn, active === x.key && s.segOn]}>
              <Text style={[s.segText, active === x.key && { color: C.blue }]}>{x.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </BlueHeader>

      <ScrollView contentContainerStyle={{ paddingTop: 16, paddingBottom: 28 }}>
        <Card style={{ padding: 18 }}>
          <IconTile name={seg.icon} color={seg.color} bg={seg.bg} box={52} size={26} round={14} />
          <Text style={s.cardTitle}>{seg.title}</Text>
          <Text style={s.cardText}>{seg.text}</Text>
          <Btn title={seg.cta} onPress={() => navigation.navigate(seg.route)} style={{ marginTop: 14 }} />
        </Card>

        <SectionTitle title="Shortcuts" />
        <Card style={{ paddingVertical: 2, paddingHorizontal: 14 }}>
          {seg.shortcuts.map((x, i) => <ListRow key={x.title} icon={x.icon} title={x.title} onPress={() => navigation.navigate(x.route)} last={i === seg.shortcuts.length - 1} />)}
        </Card>

        <SectionTitle title="All of Connect" />
        {SEGMENTS.filter(x => x.key !== active).map(x => (
          <Card key={x.key} onPress={() => setActive(x.key)} style={s.mini}>
            <IconTile name={x.icon} color={x.color} bg={x.bg} box={40} size={20} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.miniTitle}>{x.title}</Text>
              <Text style={s.miniSub} numberOfLines={1}>{x.text}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.muted} />
          </Card>
        ))}
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  segment: { flexDirection: 'row', backgroundColor: C.blueDark, borderRadius: 12, padding: 3, marginTop: 14 },
  segBtn: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center' },
  segOn: { backgroundColor: '#fff' },
  segText: { color: '#D6E5FF', fontWeight: '800', fontSize: 13 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: C.text, marginTop: 14 },
  cardText: { fontSize: 13, color: C.muted, marginTop: 6, lineHeight: 19 },
  mini: { flexDirection: 'row', alignItems: 'center' },
  miniTitle: { fontSize: 14, fontWeight: '800', color: C.text },
  miniSub: { fontSize: 12, color: C.muted, marginTop: 2 },
});
