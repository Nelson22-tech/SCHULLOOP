import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Soft-tint badges (light background + matching colored text) read as more
// professional/editorial than solid saturated-fill badges, and match the
// muted navy/teal palette used across the rest of the app instead of
// clashing with bright iOS system colors.
const VARIANTS = {
  success: { bg: '#E3F3EF', fg: '#1F7A6D' },
  warning: { bg: '#FCF0DE', fg: '#D97706' },
  danger: { bg: '#FBE8E8', fg: '#B23A3A' },
  info: { bg: '#E7F1F3', fg: '#0754D8' },
  default: { bg: '#F0F5FF', fg: '#4A5A5E' },
};

export const Badge = ({ text, variant = 'default', style }) => {
  const colors = VARIANTS[variant] || VARIANTS.default;
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }, style]}>
      <Text style={[styles.text, { color: colors.fg }]} numberOfLines={1}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
