import { useEffect } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'react-native-linear-gradient';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming,
} from 'react-native-reanimated';

export default function TabBarPlusButton({ onPress }: BottomTabBarButtonProps) {
  const glowOpacity = useSharedValue(0.6);

  useEffect(() => {
    glowOpacity.value = withRepeat(withTiming(0.95, { duration: 1500 }), -1, true);
  }, [glowOpacity]);

  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: glowOpacity.value,
  }));

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.85}>
      <Animated.View style={[styles.moonWrap, glowStyle]}>
        <LinearGradient
          colors={['#C4A55A', '#F5E680']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.circle}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 10,
  },
  moonWrap: {
    bottom: 12,
    shadowColor: '#C4A55A',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 11,
    elevation: 10,
  },
  circle: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
});
