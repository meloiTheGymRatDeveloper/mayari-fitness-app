import { useRef, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Dimensions, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, typography, spacing } from '../../constants/theme';
import Button from '../../components/ui/Button';

const { width } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    emoji: '🌙',
    title: 'Mayari',
    subtitle: 'Your Filipino fitness companion',
    body: 'Science-based workouts and nutrition — built for the Philippine lifestyle.',
  },
  {
    id: '2',
    emoji: '🤖',
    title: 'Coach Mayari',
    subtitle: 'AI coach that speaks your language',
    body: 'Get personalized workout plans and nutrition advice — in English or Tagalog.',
  },
  {
    id: '3',
    emoji: '🤝',
    title: 'Gym Buddies',
    subtitle: 'Find workout partners near you',
    body: 'Connect with Filipino fitness enthusiasts in your area. Mas masaya kapag may kasama!',
  },
];

export default function SplashScreen() {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;

  return (
    <View style={styles.container}>
      <FlatList
        data={slides}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
          useNativeDriver: false,
        })}
        onMomentumScrollEnd={(e) => {
          setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / width));
        }}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <Text style={styles.emoji}>{item.emoji}</Text>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.subtitle}</Text>
            <Text style={styles.body}>{item.body}</Text>
          </View>
        )}
      />

      <View style={styles.dots}>
        {slides.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === activeIndex && styles.dotActive]}
          />
        ))}
      </View>

      <View style={styles.actions}>
        <Button
          label="Get Started"
          onPress={() => router.push('/(auth)/signup')}
          style={styles.primaryBtn}
        />
        <Button
          label="Already have an account? Log in"
          variant="ghost"
          onPress={() => router.push('/(auth)/login')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emoji: {
    fontSize: 80,
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.brand.secondary,
    fontSize: typography['3xl'],
    fontWeight: 'bold',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.text.primary,
    fontSize: typography.lg,
    fontWeight: '600',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  body: {
    color: colors.text.secondary,
    fontSize: typography.base,
    textAlign: 'center',
    lineHeight: 24,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.text.muted,
  },
  dotActive: {
    backgroundColor: colors.brand.primary,
    width: 24,
  },
  actions: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['2xl'],
    gap: spacing.xs,
  },
  primaryBtn: {
    marginBottom: spacing.xs,
  },
});
