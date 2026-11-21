import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export const Rating = ({ value = 0, onChange = null, size = 'medium', count = 5 }) => {
  const getSize = () => {
    switch (size) {
      case 'small':
        return 16;
      case 'large':
        return 32;
      default:
        return 24;
    }
  };

  const starSize = getSize();

  return (
    <View style={styles.container}>
      {[...Array(count)].map((_, index) => (
        <TouchableOpacity
          key={index}
          onPress={() => onChange && onChange(index + 1)}
          disabled={!onChange}
          style={{ marginHorizontal: 2 }}
        >
          <Text style={{ fontSize: starSize }}>
            {index < value ? '⭐' : '☆'}
          </Text>
        </TouchableOpacity>
      ))}
      {value > 0 && (
        <Text style={styles.ratingText}>{value.toFixed(1)}/5</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
});
