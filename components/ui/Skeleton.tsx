import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, ViewStyle } from 'react-native';

interface SkeletonProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export default function Skeleton({ width, height, borderRadius = 8, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  const animatedStyle: Record<string, unknown> = {
    width: typeof width === 'string' ? width : width,
    height,
    borderRadius,
    opacity,
  };

  return (
    <Animated.View
      style={[styles.base, animatedStyle as ViewStyle, style]}
    />
  );
}

const styles = StyleSheet.create({
  base: { backgroundColor: 'rgba(196,165,90,0.08)' },
});
