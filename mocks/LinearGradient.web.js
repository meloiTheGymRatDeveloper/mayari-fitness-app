import React from 'react';
import { View } from 'react-native';

export default function LinearGradient({ children, style, colors, ...props }) {
  return (
    <View style={[style, { backgroundColor: colors?.[0] ?? 'transparent' }]} {...props}>
      {children}
    </View>
  );
}
