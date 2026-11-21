// SchulLoop UI kit — shared building blocks that reproduce the approved preview boards
// (blue gradient headers, white rounded cards, pill chips, 4/5-item bottom bars).
import { Ionicons } from '@expo/vector-icons';
import { isDarkApplied, DARK_C } from '../theme/darkTheme';
import { Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export const C = {
  blue: '#0B5FE8', blueDark: '#0A47B8', blueDeep: '#0838A0', blueSoft: '#EAF2FF', blueLine: '#DCE7F8',
  bg: '#F4F8FF', card: '#FFFFFF', text: '#0F2A5C', muted: '#6B7A94', border: '#E3EBF8',
  green: '#16A34A', greenSoft: '#E4F6EA', amber: '#D98A00', amberSoft: '#FFF1D6', red: '#DC3A3A', redSoft: '#FDE7E7',
  purple: '#7C4DFF', purpleSoft: '#EEE8FF', orange: '#F59E0B', white: '#FFFFFF',
};
if (isDarkApplied()) Object.assign(C, DARK_C);
export const topPad = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 44;
export const shadow = { shadowColor: '#0B3A8F', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 };

export const Screen = ({ children, scroll = true, style, contentStyle, ...rest }) => scroll
  ? <ScrollView style={[k.screen, style]} contentContainerStyle={[{ paddingBottom: 28 }, contentStyle]} showsVerticalScrollIndicator={false} {...rest}>{children}</ScrollView>
  : <View style={[k.screen, style]}>{children}</View>;

// Blue header band. Pass onBack for the "‹ Title" style; `children` renders below (search, chips, profile...).
export const BlueHeader = ({ title, subtitle, onBack, right, children, brand, style }) => (
  <View style={[k.header, style]}>
    <View style={k.headerRow}>
      {onBack ? <TouchableOpacity onPress={onBack} hitSlop={12} style={{ marginRight: 12 }}><Ionicons name="arrow-back" size={22} color="#fff" /></TouchableOpacity> : null}
      {brand ? <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}><Ionicons name="school" size={26} color="#fff" /><Text style={k.brandText}>SchulLoop</Text></View>
        : <View style={{ flex: 1 }}><Text style={k.headerTitle} numberOfLines={1}>{title}</Text>{subtitle ? <Text style={k.headerSub}>{subtitle}</Text> : null}</View>}
      {right}
    </View>
    {children}
  </View>
);
// White header (Login, Notifications, Applications style)
export const WhiteHeader = ({ title, onBack, right }) => (
  <View style={k.whiteHeader}>
    {onBack ? <TouchableOpacity onPress={onBack} hitSlop={12} style={{ marginRight: 12 }}><Ionicons name="arrow-back" size={22} color={C.text} /></TouchableOpacity> : null}
    <Text style={k.whiteTitle} numberOfLines={1}>{title}</Text><View style={{ flex: 1 }} />{right}
  </View>
);

export const IconBtn = ({ name, onPress, badge, color = '#fff', size = 22 }) => (
  <TouchableOpacity onPress={onPress} hitSlop={10} style={{ marginLeft: 14 }}>
    <Ionicons name={name} size={size} color={color} />{badge ? <View style={k.dot} /> : null}
  </TouchableOpacity>
);

export const Card = ({ children, style, onPress }) => onPress
  ? <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={[k.card, style]}>{children}</TouchableOpacity>
  : <View style={[k.card, style]}>{children}</View>;

export const Btn = ({ title, onPress, variant = 'primary', icon, style, disabled }) => (
  <TouchableOpacity disabled={disabled} activeOpacity={0.85} onPress={onPress} style={[k.btn, variant === 'outline' ? k.btnOutline : variant === 'white' ? k.btnWhite : null, disabled && { opacity: 0.5 }, style]}>
    {icon ? <Ionicons name={icon} size={18} color={variant === 'primary' ? '#fff' : C.blue} style={{ marginRight: 8 }} /> : null}
    <Text style={[k.btnText, variant !== 'primary' && { color: C.blue }]}>{title}</Text>
  </TouchableOpacity>
);

export const Chip = ({ label, active, onPress, style }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[k.chip, active ? k.chipOn : k.chipOff, style]}>
    <Text style={[k.chipText, { color: active ? '#fff' : C.blue }]}>{label}</Text>
  </TouchableOpacity>
);
export const ChipRow = ({ items, value, onChange, style }) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[{ flexGrow: 0 }, style]} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}>
    {items.map(i => <Chip key={i} label={i} active={value === i} onPress={() => onChange(i)} />)}
  </ScrollView>
);

const tones = { green: [C.greenSoft, C.green], amber: [C.amberSoft, C.amber], red: [C.redSoft, C.red], blue: [C.blueSoft, C.blue], purple: [C.purpleSoft, C.purple], gray: ['#EEF1F6', C.muted] };
export const StatusPill = ({ label, tone = 'blue', style }) => (
  <View style={[k.pill, { backgroundColor: tones[tone][0] }, style]}><Text style={[k.pillText, { color: tones[tone][1] }]}>{label}</Text></View>
);
export const toneFor = (status = '') => { const s = String(status).toLowerCase(); return /accept|paid|success|hired|verified|complete|active|current/.test(s) ? 'green' : /reject|fail|declin|not selected/.test(s) ? 'red' : /pend|review|submitted|applied|progress|wait/.test(s) ? 'amber' : /interview/.test(s) ? 'purple' : 'blue'; };

export const SectionTitle = ({ title, action, onAction, style }) => (
  <View style={[k.sectionRow, style]}><Text style={k.sectionTitle}>{title}</Text>{action ? <TouchableOpacity onPress={onAction}><Text style={k.link}>{action}</Text></TouchableOpacity> : null}</View>
);

export const IconTile = ({ name, color = C.blue, bg = C.blueSoft, size = 22, box = 44, round = 12 }) => (
  <View style={{ width: box, height: box, borderRadius: round, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={name} size={size} color={color} /></View>
);

export const SearchField = ({ value, onChangeText, placeholder, onFilter, style, onSubmitEditing }) => (
  <View style={[k.search, style]}>
    <Ionicons name="search" size={18} color={C.muted} />
    <TextInput value={value} onChangeText={onChangeText} onSubmitEditing={onSubmitEditing} placeholder={placeholder} placeholderTextColor="#8A97AE" style={k.searchInput} />
    {onFilter ? <TouchableOpacity onPress={onFilter}><Ionicons name="options-outline" size={20} color={C.blue} /></TouchableOpacity> : null}
  </View>
);

export const Field = ({ label, required, style, ...props }) => (
  <View style={[{ marginBottom: 14 }, style]}>
    <Text style={k.label}>{label}{required ? <Text style={{ color: C.red }}> *</Text> : null}</Text>
    <TextInput placeholderTextColor="#9AA6BC" style={k.input} {...props} />
  </View>
);

export const ListRow = ({ icon, title, subtitle, onPress, right, last }) => (
  <TouchableOpacity activeOpacity={onPress ? 0.7 : 1} onPress={onPress} style={[k.listRow, !last && k.listBorder]}>
    {icon ? <Ionicons name={icon} size={20} color={C.blue} style={{ width: 30 }} /> : null}
    <View style={{ flex: 1 }}><Text style={k.rowTitle}>{title}</Text>{subtitle ? <Text style={k.rowSub}>{subtitle}</Text> : null}</View>
    {right || (onPress ? <Ionicons name="chevron-forward" size={18} color={C.muted} /> : null)}
  </TouchableOpacity>
);

export const Initials = ({ name = '?', size = 40, bg = C.blue }) => (
  <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
    <Text style={{ color: '#fff', fontWeight: '800', fontSize: size * 0.38 }}>{String(name).split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}</Text>
  </View>
);

export const Stepper = ({ steps, current }) => (
  <View style={k.stepper}>
    {steps.map((s, i) => (
      <View key={s} style={{ flex: 1, alignItems: 'center' }}>
        <View style={[k.stepDot, i <= current ? { backgroundColor: C.blue, borderColor: C.blue } : null]}><Text style={{ color: i <= current ? '#fff' : C.muted, fontWeight: '800', fontSize: 12 }}>{i + 1}</Text></View>
        <Text style={{ fontSize: 11, color: i <= current ? C.blue : C.muted, marginTop: 4 }}>{s}</Text>
      </View>
    ))}
  </View>
);

// Module bottom bar (Student Connect / Student Portal / Job Portal boards each show their own bar).
// items: [{key,label,icon,route,params}] — active: key
export const ModuleBar = ({ items, active, navigation }) => (
  <View style={k.bar}>
    {items.map(i => {
      const on = i.key === active;
      return (
        <TouchableOpacity key={i.key} style={k.barItem} onPress={() => i.route && navigation.navigate(i.route, i.params)}>
          <Ionicons name={on ? i.icon : `${i.icon}-outline`} size={22} color={on ? C.blue : C.muted} />
          <Text style={{ fontSize: 10, marginTop: 2, color: on ? C.blue : C.muted, fontWeight: on ? '800' : '500' }}>{i.label}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
);
// Main 5-item bar (SRS v3.2) for stack screens that live under a main section.
export const MAIN_BAR = [
  { key: 'home', label: 'Home', icon: 'home', route: 'MainTabs', params: { screen: 'HomeTab' } },
  { key: 'explore', label: 'Explore', icon: 'compass', route: 'MainTabs', params: { screen: 'ExploreTab' } },
  { key: 'connect', label: 'Connect', icon: 'people', route: 'MainTabs', params: { screen: 'ConnectTab' } },
  { key: 'activities', label: 'Activities', icon: 'layers', route: 'MainTabs', params: { screen: 'ActivitiesTab' } },
  { key: 'profile', label: 'Profile', icon: 'person', route: 'MainTabs', params: { screen: 'ProfileTab' } },
];
export const CONNECT_BAR = [
  { key: 'home', label: 'Home', icon: 'home', route: 'MainTabs' },
  { key: 'connect', label: 'Connect', icon: 'people', route: 'StudentConnect' },
  { key: 'messages', label: 'Messages', icon: 'mail', route: 'Messages' },
  { key: 'profile', label: 'Profile', icon: 'person', route: 'StudentProfile' },
];
export const PORTAL_BAR = [
  { key: 'home', label: 'Home', icon: 'home', route: 'StudentPortal' },
  { key: 'applications', label: 'Applications', icon: 'document-text', route: 'MyApplications' },
  { key: 'payments', label: 'Payments', icon: 'card', route: 'PaymentHistory' },
  { key: 'documents', label: 'Documents', icon: 'folder', route: 'Documents' },
  { key: 'profile', label: 'Profile', icon: 'person', route: 'StudentProfile' },
];
export const JOB_BAR = [
  { key: 'home', label: 'Home', icon: 'home', route: 'MainTabs' },
  { key: 'jobs', label: 'Jobs', icon: 'briefcase', route: 'JobPortal' },
  { key: 'applications', label: 'Applications', icon: 'clipboard', route: 'MyJobApplications' },
  { key: 'messages', label: 'Messages', icon: 'chatbubble-ellipses', route: 'JobMessages' },
  { key: 'profile', label: 'Profile', icon: 'person', route: 'JobProfile' },
];

export const k = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  header: { backgroundColor: C.blue, paddingTop: topPad, paddingHorizontal: 16, paddingBottom: 16, borderBottomLeftRadius: 0 },
  headerRow: { flexDirection: 'row', alignItems: 'center', minHeight: 40 },
  headerTitle: { color: '#fff', fontSize: 19, fontWeight: '800' },
  headerSub: { color: '#D6E5FF', fontSize: 12, marginTop: 2 },
  brandText: { color: '#fff', fontSize: 20, fontWeight: '800', marginLeft: 8 },
  whiteHeader: { backgroundColor: '#fff', paddingTop: topPad, paddingHorizontal: 16, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: C.border },
  whiteTitle: { fontSize: 18, fontWeight: '800', color: C.text },
  dot: { position: 'absolute', right: -2, top: -2, width: 9, height: 9, borderRadius: 5, backgroundColor: '#FF4D4F', borderWidth: 1.5, borderColor: C.blue },
  card: { backgroundColor: C.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.border, marginHorizontal: 16, marginBottom: 12, ...shadow },
  btn: { backgroundColor: C.blue, borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  btnOutline: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: C.blue },
  btnWhite: { backgroundColor: '#fff' },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  chipOn: { backgroundColor: C.blue }, chipOff: { backgroundColor: C.blueSoft },
  chipText: { fontSize: 13, fontWeight: '700' },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  pillText: { fontSize: 11, fontWeight: '800' },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginTop: 6, marginBottom: 10 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: C.text },
  link: { color: C.blue, fontWeight: '700', fontSize: 13 },
  search: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, height: 46, marginTop: 14 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: C.text, paddingVertical: 0 },
  label: { fontSize: 12, fontWeight: '700', color: C.text, marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, height: 46, fontSize: 14, color: C.text },
  listRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 4 },
  listBorder: { borderBottomWidth: 1, borderBottomColor: '#EDF2FA' },
  rowTitle: { fontSize: 14, fontWeight: '700', color: C.text }, rowSub: { fontSize: 12, color: C.muted, marginTop: 2 },
  stepper: { flexDirection: 'row', paddingHorizontal: 24, paddingVertical: 14, backgroundColor: '#fff' },
  stepDot: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: C.blueLine, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  bar: { flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: C.border, paddingTop: 8, paddingBottom: Platform.OS === 'ios' ? 22 : 10 },
  barItem: { flex: 1, alignItems: 'center' },
});
