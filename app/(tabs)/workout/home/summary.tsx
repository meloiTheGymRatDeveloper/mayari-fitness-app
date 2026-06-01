import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, typography, spacing, fonts, labelStyle } from '../../../../constants/theme';
import { useFeatureAccess } from '../../../../hooks/useFeatureAccess';

const HOME_GREEN = colors.success;

export default function HomeWorkoutSummary() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isPro } = useFeatureAccess();

  const handleDone = () => {
    router.replace('/(tabs)/workout/home' as never);
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing.lg }]}
    >
      <Text style={styles.emoji}>🏠</Text>
      <Text style={styles.title}>Workout Complete!</Text>
      <Text style={styles.subtitle}>Great job finishing your home session</Text>

      {isPro && (
        <View style={styles.nudgeCard}>
          <Text style={labelStyle}>Ready to Progress</Text>
          <Text style={styles.nudgeText}>
            You hit all your reps cleanly today. Try a harder variant next session to keep progressing.
          </Text>
          <Text style={styles.nudgeHint}>Check the exercise variants in your plan for suggestions.</Text>
        </View>
      )}

      <TouchableOpacity style={styles.doneBtn} onPress={handleDone}>
        <Text style={styles.doneBtnText}>Back to Home Workout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg.primary },
  container: { padding: spacing.lg, paddingBottom: spacing['2xl'], alignItems: 'center' },
  emoji: { fontSize: 56, marginBottom: spacing.md },
  title: { color: colors.text.primary, fontSize: typography['2xl'], fontFamily: fonts.bold, marginBottom: 4 },
  subtitle: { color: colors.text.secondary, fontSize: typography.sm, marginBottom: spacing.lg, textAlign: 'center' },
  nudgeCard: {
    backgroundColor: HOME_GREEN + '15',
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: HOME_GREEN + '40',
    width: '100%',
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  nudgeText: { color: colors.text.primary, fontSize: typography.sm, fontFamily: fonts.semibold },
  nudgeHint: { color: colors.text.secondary, fontSize: typography.xs },
  doneBtn: {
    backgroundColor: HOME_GREEN,
    borderRadius: 14,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    width: '100%',
    alignItems: 'center',
  },
  doneBtnText: { color: '#fff', fontSize: typography.base, fontFamily: fonts.bold },
});
