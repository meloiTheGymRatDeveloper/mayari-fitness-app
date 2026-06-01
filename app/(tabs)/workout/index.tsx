import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, fonts } from '../../../constants/theme';
import { useAllPlans } from '../../../hooks/useWorkout';
import { useCardioEnrollment } from '../../../hooks/useCardio';

function WorkoutTypeCard({
  label,
  emoji,
  color,
  statusLine,
  onPress,
}: {
  label: string;
  emoji: string;
  color: string;
  statusLine: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[styles.card, { borderLeftColor: color }]} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.iconBox, { backgroundColor: color + '20' }]}>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>
      <View style={styles.cardText}>
        <Text style={styles.cardLabel}>{label}</Text>
        <Text style={styles.cardStatus}>{statusLine}</Text>
      </View>
      <Text style={[styles.chevron, { color }]}>›</Text>
    </TouchableOpacity>
  );
}

export default function WorkoutLanding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: allPlans = [] } = useAllPlans();
  const { data: runningEnrollment } = useCardioEnrollment('running');
  const { data: cyclingEnrollment } = useCardioEnrollment('cycling');

  const gymPlanCount = allPlans.filter(p => !p.workout_type || p.workout_type === 'gym').length;
  const homePlanCount = allPlans.filter(p => p.workout_type === 'home').length;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={{ padding: 20, paddingTop: insets.top + 20, paddingBottom: 40 }}
    >
      <Text style={styles.heading}>Workout</Text>
      <Text style={styles.subheading}>Choose your training type</Text>

      <View style={styles.list}>
        <WorkoutTypeCard
          label="Gym"
          emoji="🏋️"
          color={colors.brand.primary}
          statusLine={gymPlanCount > 0 ? `${gymPlanCount} active plan${gymPlanCount > 1 ? 's' : ''}` : 'No active plans'}
          onPress={() => router.push('/(tabs)/workout/gym' as never)}
        />
        <WorkoutTypeCard
          label="Home Workout"
          emoji="🏠"
          color={colors.success}
          statusLine={homePlanCount > 0 ? `${homePlanCount} active plan${homePlanCount > 1 ? 's' : ''}` : 'Bodyweight & equipment'}
          onPress={() => router.push('/(tabs)/workout/home' as never)}
        />
        <WorkoutTypeCard
          label="Running"
          emoji="🏃"
          color={colors.warning}
          statusLine={
            runningEnrollment
              ? `Week ${runningEnrollment.current_week} · ${runningEnrollment.plan_template_id}`
              : 'Log runs, track progress'
          }
          onPress={() => router.push('/(tabs)/workout/running' as never)}
        />
        <WorkoutTypeCard
          label="Cycling"
          emoji="🚴"
          color={colors.error}
          statusLine={
            cyclingEnrollment
              ? `Week ${cyclingEnrollment.current_week} · ${cyclingEnrollment.plan_template_id}`
              : 'Outdoor & indoor rides'
          }
          onPress={() => router.push('/(tabs)/workout/cycling' as never)}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg.primary },
  heading: {
    color: colors.text.primary,
    fontSize: 28,
    fontFamily: fonts.bold,
    marginBottom: 4,
  },
  subheading: {
    color: colors.text.secondary,
    fontSize: 14,
    fontFamily: fonts.regular,
    marginBottom: 20,
  },
  list: { gap: 12 },
  card: {
    backgroundColor: colors.bg.secondary,
    borderRadius: 14,
    borderLeftWidth: 4,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 24 },
  cardText: { flex: 1 },
  cardLabel: { color: colors.text.primary, fontSize: 16, fontFamily: fonts.bold },
  cardStatus: { color: colors.text.secondary, fontSize: 13, marginTop: 2 },
  chevron: { fontSize: 22 },
});
