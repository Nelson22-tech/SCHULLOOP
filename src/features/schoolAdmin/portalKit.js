// School Admin Portal UI kit - reproduces the approved "School Administrator Portal" preview
// (navy sidebar, white rounded cards, pill badges, outlined buttons, blue eyebrow labels).
import { Ionicons } from '@expo/vector-icons';
import { Children, useState } from 'react';
import { Image, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { API_BASE_URL } from '../../shared/config/api';

export const P = {
  navy: '#102d59', blue: '#2468b2', ink: '#17243a', muted: '#718096', line: '#e6ebf2', bg: '#f4f7fb',
  green: '#198754', amber: '#b7791f', red: '#b42318', field: '#dce3ec', label: '#46556b',
};

// Uploaded files are served by the API host (/uploads/...). Absolute URLs pass through.
export const assetUrl = (u) => (!u ? '' : /^https?:/i.test(u) ? u : API_BASE_URL.replace(/\/api\/?$/, '') + u);

export const PageHead = ({ eyebrow, title, sub, actions }) => (
  <View style={k.pagehead}>
    <View style={{ flex: 1, minWidth: 220 }}>
      <Text style={k.eyebrow}>{String(eyebrow || '').toUpperCase()}</Text>
      <Text style={k.h1}>{title}</Text>
      {sub ? <Text style={k.sub}>{sub}</Text> : null}
    </View>
    {actions ? <View style={k.actions}>{actions}</View> : null}
  </View>
);

export const Card = ({ children, style }) => <View style={[k.card, style]}>{children}</View>;
export const H3 = ({ children, style }) => <Text style={[k.h3, style]}>{children}</Text>;
export const Muted = ({ children, style }) => <Text style={[k.muted, style]}>{children}</Text>;
export const Hint = ({ children, style }) => <Text style={[k.hint, style]}>{children}</Text>;

const PILL = {
  amber: { bg: '#fff4df', fg: '#9a650c' },
  green: { bg: '#e7f6ed', fg: '#167342' },
  gray: { bg: '#eef1f5', fg: '#596579' },
  red: { bg: '#fdeceb', fg: '#b42318' },
};
export const Pill = ({ tone = 'amber', label }) => (
  <View style={[k.pill, { backgroundColor: PILL[tone].bg }]}><Text style={[k.pillText, { color: PILL[tone].fg }]}>{label}</Text></View>
);

export const Btn = ({ title, onPress, kind = 'default', disabled, style, icon }) => {
  const primary = kind === 'primary';
  const soft = kind === 'soft';
  const danger = kind === 'danger';
  return (
    <TouchableOpacity disabled={disabled} activeOpacity={0.85} onPress={onPress}
      style={[k.btn, primary && k.btnPrimary, soft && k.btnSoft, disabled && { opacity: 0.55 }, style]}>
      {icon ? <Ionicons name={icon} size={15} color={primary ? '#fff' : soft ? P.blue : P.ink} style={{ marginRight: 6 }} /> : null}
      <Text style={[k.btnText, primary && { color: '#fff' }, soft && { color: P.blue }, danger && { color: P.red }]}>{title}</Text>
    </TouchableOpacity>
  );
};

export const Notice = ({ children }) => <View style={k.notice}><Text style={k.noticeText}>{children}</Text></View>;

export const Stat = ({ label, value, foot, footColor }) => (
  <View style={k.stat}>
    <Text style={k.statLabel}>{label}</Text>
    <Text style={k.statNum}>{value}</Text>
    {foot ? <Text style={[k.statFoot, footColor && { color: footColor }]}>{foot}</Text> : null}
  </View>
);

// Responsive grid for stat cards: 4 across on wide screens, 2 across on phones.
export const StatGrid = ({ children }) => {
  const { width } = useWindowDimensions();
  const cols = width >= 900 ? 4 : 2;
  return (
    <View style={k.statGrid}>
      {Children.toArray(children).map((c, i) => <View key={i} style={{ width: cols === 4 ? '24%' : '48.5%' }}>{c}</View>)}
    </View>
  );
};

export const FormGrid = ({ children }) => {
  const { width } = useWindowDimensions();
  const two = width >= 700;
  return (
    <View style={k.formgrid}>
      {Children.toArray(children).filter(Boolean).map((c, i) => (
        <View key={i} style={{ width: two && !(c.props && c.props.full) ? '48.5%' : '100%' }}>{c}</View>
      ))}
    </View>
  );
};

export const Field = ({ label, value, onChangeText, placeholder, multiline, keyboardType, editable = true, autoCapitalize }) => (
  <View>
    {label ? <Text style={k.label}>{label}</Text> : null}
    <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#9aa7ba"
      multiline={multiline} keyboardType={keyboardType} editable={editable} autoCapitalize={autoCapitalize}
      style={[k.input, multiline && { minHeight: 96, textAlignVertical: 'top' }, !editable && { backgroundColor: '#f6f8fb', color: P.muted }]} />
  </View>
);

export const Select = ({ label, value, options, onChange }) => {
  const [open, setOpen] = useState(false);
  return (
    <View>
      {label ? <Text style={k.label}>{label}</Text> : null}
      <TouchableOpacity activeOpacity={0.85} onPress={() => setOpen(!open)} style={[k.input, k.select]}>
        <Text style={{ color: value ? P.ink : '#9aa7ba', flex: 1 }} numberOfLines={1}>{value || 'Select'}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={P.muted} />
      </TouchableOpacity>
      {open ? (
        <View style={k.options}>
          {options.map((o) => (
            <TouchableOpacity key={o} onPress={() => { onChange(o); setOpen(false); }} style={[k.option, o === value && { backgroundColor: '#edf4fc' }]}>
              <Text style={{ color: o === value ? P.blue : P.ink, fontWeight: o === value ? '700' : '400' }}>{o}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
};

export const Check = ({ label, checked, onToggle }) => (
  <TouchableOpacity activeOpacity={0.8} onPress={onToggle} style={k.check}>
    <View style={[k.box, checked && { backgroundColor: P.blue, borderColor: P.blue }]}>{checked ? <Ionicons name="checkmark" size={13} color="#fff" /> : null}</View>
    <Text style={k.checkText}>{label}</Text>
  </TouchableOpacity>
);

export const ListItem = ({ title, sub, right, last }) => (
  <View style={[k.listitem, last && { borderBottomWidth: 0 }]}>
    <View style={{ flex: 1 }}>
      <Text style={k.liTitle}>{title}</Text>
      {sub ? <Text style={k.liSub}>{sub}</Text> : null}
    </View>
    {right}
  </View>
);

export const Progress = ({ pct }) => (
  <View style={k.progress}><View style={[k.progressFill, { width: `${Math.max(0, Math.min(100, pct))}%` }]} /></View>
);

export const UploadBox = ({ icon = 'cloud-upload-outline', title, hint, onPress, children }) => (
  <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={k.uploadbox}>
    {children || <Ionicons name={icon} size={26} color={P.blue} />}
    <Text style={k.uploadTitle}>{title}</Text>
    {hint ? <Text style={k.hint}>{hint}</Text> : null}
  </TouchableOpacity>
);

export const Thumb = ({ uri, style }) => (uri ? <Image source={{ uri: assetUrl(uri) }} style={style} resizeMode="cover" /> : <View style={[style, { backgroundColor: '#edf3fa' }]} />);

export const k = StyleSheet.create({
  pagehead: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, marginBottom: 22 },
  eyebrow: { color: P.blue, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  h1: { fontSize: 26, fontWeight: '800', color: P.ink, marginTop: 5, marginBottom: 4 },
  sub: { color: P.muted, fontSize: 14, lineHeight: 20 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: P.line, borderRadius: 15, padding: 18, marginBottom: 16, shadowColor: '#1b3650', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  h3: { fontSize: 15, fontWeight: '800', color: P.ink, marginBottom: 12 },
  muted: { color: P.muted, fontSize: 12, marginBottom: 14, marginTop: -6 },
  hint: { fontSize: 11, color: P.muted, marginTop: 3 },
  pill: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 99 },
  pillText: { fontSize: 11, fontWeight: '700' },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: P.line, backgroundColor: '#fff', borderRadius: 9, paddingHorizontal: 14, paddingVertical: 10 },
  btnPrimary: { backgroundColor: P.blue, borderColor: P.blue },
  btnSoft: { backgroundColor: '#edf4fc', borderColor: '#dce9f8' },
  btnText: { color: P.ink, fontWeight: '700', fontSize: 14 },
  notice: { borderRadius: 11, padding: 13, backgroundColor: '#fff8e9', borderWidth: 1, borderColor: '#f5e4bd', marginBottom: 15 },
  noticeText: { color: '#805b16', fontSize: 12, lineHeight: 18 },
  stat: { backgroundColor: '#fff', borderWidth: 1, borderColor: P.line, borderRadius: 15, padding: 16, shadowColor: '#1b3650', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  statLabel: { color: P.muted, fontSize: 12 },
  statNum: { fontSize: 27, fontWeight: '800', color: P.ink, marginTop: 7, marginBottom: 2 },
  statFoot: { fontSize: 11, color: P.green },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12, marginBottom: 18 },
  formgrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 15 },
  label: { fontSize: 12, fontWeight: '700', color: P.label, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: P.field, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 11, backgroundColor: '#fff', color: P.ink, fontSize: 14 },
  select: { flexDirection: 'row', alignItems: 'center' },
  options: { borderWidth: 1, borderColor: P.field, borderRadius: 9, backgroundColor: '#fff', marginTop: 4, overflow: 'hidden' },
  option: { paddingHorizontal: 12, paddingVertical: 11 },
  check: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, minWidth: 150 },
  box: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: '#b8c9dc', alignItems: 'center', justifyContent: 'center', marginRight: 9, backgroundColor: '#fff' },
  checkText: { color: P.ink, fontSize: 14 },
  listitem: { paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: P.line, flexDirection: 'row', alignItems: 'center', gap: 12 },
  liTitle: { fontWeight: '700', color: P.ink, fontSize: 14 },
  liSub: { color: P.muted, fontSize: 12, marginTop: 3, lineHeight: 17 },
  progress: { height: 8, borderRadius: 10, backgroundColor: '#edf0f5', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#23945b', borderRadius: 10 },
  uploadbox: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#b8c9dc', borderRadius: 13, padding: 22, alignItems: 'center', backgroundColor: '#f9fbfe', gap: 4 },
  uploadTitle: { fontWeight: '800', color: P.ink, marginTop: 4 },
});
