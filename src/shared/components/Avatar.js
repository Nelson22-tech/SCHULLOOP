import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

const initials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map((x) => x[0]).join('').toUpperCase() || '?';

// Deterministic accent color per person, picked from the app's palette,
// so initials avatars feel distinct from each other rather than all
// being one flat navy square (closer to how LinkedIn/Slack tint initials).
const PALETTE = ['#0754D8', '#14B8A6', '#2A9D8F', '#8A5A9E', '#0866FF', '#3D6E99'];
const colorFor = (seed = '') => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
};

export const Avatar = ({ uri, name, size = 44, ring = false, style }) => {
  const dim = { width: size, height: size, borderRadius: size / 2 };
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[dim, styles.image, ring && styles.ring, style]}
      />
    );
  }
  return (
    <View style={[dim, styles.fallback, { backgroundColor: colorFor(name) }, ring && styles.ring, style]}>
      <Text style={[styles.initials, { fontSize: Math.max(12, size * 0.38) }]}>{initials(name)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  image: {
    backgroundColor: '#F0F5FF',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  initials: {
    color: '#fff',
    fontWeight: '700',
  },
});
