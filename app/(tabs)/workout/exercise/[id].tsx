import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useExerciseById } from '../../../../hooks/useWorkout';
import { colors, typography, spacing } from '../../../../constants/theme';

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: exercise, isLoading } = useExerciseById(id ?? '');

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.brand.primary} />
      </View>
    );
  }

  if (!exercise) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notFound}>Exercise not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.name}>{exercise.name}</Text>

      <View style={styles.row}>
        <Text style={styles.fieldLabel}>Category</Text>
        <Text style={styles.fieldValue}>{exercise.category}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.fieldLabel}>Muscle Group</Text>
        <Text style={[styles.fieldValue, styles.groupText]}>{exercise.muscle_group.toUpperCase()}</Text>
      </View>

      {exercise.muscles_primary.length > 0 && (
        <View style={styles.row}>
          <Text style={styles.fieldLabel}>Primary Muscles</Text>
          <Text style={styles.fieldValue}>{exercise.muscles_primary.join(', ')}</Text>
        </View>
      )}
      {exercise.muscles_secondary.length > 0 && (
        <View style={styles.row}>
          <Text style={styles.fieldLabel}>Secondary Muscles</Text>
          <Text style={styles.fieldValue}>{exercise.muscles_secondary.join(', ')}</Text>
        </View>
      )}
      {exercise.equipment.length > 0 && (
        <View style={styles.row}>
          <Text style={styles.fieldLabel}>Equipment</Text>
          <Text style={styles.fieldValue}>{exercise.equipment.join(', ')}</Text>
        </View>
      )}

      {exercise.description.length > 0 && (
        <View style={styles.descCard}>
          <Text style={styles.descText}>{exercise.description}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg.primary },
  container: { padding: spacing.lg, paddingBottom: spacing['2xl'] },
  centered: { flex: 1, backgroundColor: colors.bg.primary, justifyContent: 'center', alignItems: 'center' },
  notFound: { color: colors.text.secondary, fontSize: typography.base },
  name: { color: colors.text.primary, fontSize: typography['2xl'], fontWeight: '700', marginBottom: spacing.lg },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  fieldLabel: { color: colors.text.muted, fontSize: typography.sm },
  fieldValue: { color: colors.text.primary, fontSize: typography.sm, flex: 1, textAlign: 'right' },
  groupText: { color: colors.brand.primary, fontWeight: '700' },
  descCard: { marginTop: spacing.lg, backgroundColor: colors.bg.secondary, borderRadius: 12, padding: spacing.md },
  descText: { color: colors.text.secondary, fontSize: typography.sm, lineHeight: 22 },
});
