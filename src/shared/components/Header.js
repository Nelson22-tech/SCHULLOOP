import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';

export const Header = ({ title, subtitle, onBackPress, rightAction, rightActionText, rightSlot }) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.content}>
          {onBackPress && (
            <TouchableOpacity onPress={onBackPress} style={styles.backButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.backIcon}>‹</Text>
            </TouchableOpacity>
          )}
          <View style={styles.titleContainer}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            {subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
          </View>
        </View>
        {rightAction && (
          <TouchableOpacity onPress={rightAction} style={styles.rightAction}>
            <Text style={styles.rightActionText}>{rightActionText}</Text>
          </TouchableOpacity>
        )}
        {rightSlot}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#0754D8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: '#0754D8',
    // A subtle bottom shadow separates the header from scrolling content
    // beneath it, which reads as more deliberate than a flat hard edge.
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    marginRight: 6,
    marginLeft: -8,
  },
  backIcon: {
    fontSize: 26,
    color: '#fff',
    fontWeight: '400',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.1,
  },
  subtitle: {
    fontSize: 12.5,
    color: '#A9C2CC',
    marginTop: 2,
  },
  rightAction: {
    paddingHorizontal: 12,
  },
  rightActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
