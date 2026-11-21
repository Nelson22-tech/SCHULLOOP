import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from './Button';

export const EmptyState = ({ icon = '○', title, message, actionTitle, onAction, style }) => (
  <View style={[styles.container, style]}>
    <View style={styles.iconWrap}>
      <Text style={styles.icon}>{icon}</Text>
    </View>
    <Text style={styles.title}>{title}</Text>
    {message ? <Text style={styles.message}>{message}</Text> : null}
    {actionTitle && onAction ? (
      <Button title={actionTitle} onPress={onAction} variant="secondary" size="small" style={styles.action} />
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E4ECEA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  icon: { fontSize: 30 },
  title: { fontSize: 17, fontWeight: '700', color: '#102A56', textAlign: 'center' },
  message: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
    maxWidth: 360,
  },
  action: { marginTop: 18 },
});
