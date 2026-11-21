import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';

export const Card = ({ children, onPress, style, image, imageHeight = 200 }) => {
  const content = (
    <View style={[styles.card, style]}>
      {image && (
        <Image
          source={{ uri: image }}
          style={[styles.image, { height: imageHeight }]}
          resizeMode="cover"
        />
      )}
      {children}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginHorizontal: 16,
    marginVertical: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#DCE7F5',
    // A crisp 1px border carries most of the definition; the shadow is
    // kept very light so cards read as "flat professional", not "glossy".
    shadowColor: '#0754D8',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  image: {
    width: '100%',
    backgroundColor: '#F0F5FF',
  },
});
