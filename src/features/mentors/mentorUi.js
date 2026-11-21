// Small shared helpers for the mentorship screens.
import { Image, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, Initials } from '../../shared/ui/kit';

export const money = (value, currency = 'USD') => {
  const n = Number(value) || 0;
  const text = Number.isInteger(n) ? String(n) : n.toFixed(2);
  return currency === 'USD' ? `$${text}` : `${currency} ${text}`;
};

export const fmtDateTime = (iso) => new Date(iso).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
export const fmtDay = (iso) => new Date(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
export const fmtTime = (iso) => new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

export const MentorAvatar = ({ name, uri, size = 56 }) => (uri
  ? <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
  : <Initials name={name || '?'} size={size} />);

export const Stars = ({ value = 0, count, size = 14 }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
    <Ionicons name="star" size={size} color="#F5A623" />
    <Text style={{ marginLeft: 4, fontWeight: '800', color: C.text, fontSize: size }}>{count ? Number(value).toFixed(1) : 'New'}</Text>
    {count ? <Text style={{ marginLeft: 4, color: C.muted, fontSize: size - 1 }}>({count})</Text> : null}
  </View>
);

export const SUBJECTS = ['All', 'Mathematics', 'English', 'Science', 'Computer Science', 'Business', 'Languages', 'Exam prep', 'Career advice', 'University admissions'];
