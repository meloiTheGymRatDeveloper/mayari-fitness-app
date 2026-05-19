import { useState, useMemo } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useExercises } from '../../../../hooks/useWorkout';
import { colors, typography, spacing } from '../../../../constants/theme';
import type { Exercise } from '../../../../types/database';

type Filter = 'all' | 'push' | 'pull' | 'legs' | 'core';
const FILTERS: Filter[] = ['all', 'push', 'pull', 'legs', 'core'];

const GROUP_COLORS: Record<string, string> = {
  push: '#6366F1',
  pull: '#A78BFA',
  legs: '#22C55E',
  core: '#F59E0B',
};

export default function ExerciseLibraryScreen() {
  const router = useRouter();
  const { data: exercises = [], isLoading } = useExercises();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return exercises.filter(ex => {
      const matchesSearch = ex.name.toLowerCase().includes(q);
      const matchesFilter = filter === 'all' || ex.muscle_group === filter;
      return matchesSearch && matchesFilter;
    });
  }, [exercises, search, filter]);

  function renderItem({ item }: { item: Exercise }) {
    return (
      <TouchableOpacity
        style={styles.item}
        onPress={() => router.push({ pathname: '/(tabs)/workout/exercise/[id]', params: { id: item.id } })}
      >
        <View style={styles.itemLeft}>
          <Text style={styles.itemName}>{item.name}</Text>
          {item.muscles_primary.length > 0 && (
            <Text style={styles.itemMuscles}>{item.muscles_primary.slice(0, 2).join(', ')}</Text>
          )}
        </View>
        <View style={[styles.groupBadge, { backgroundColor: GROUP_COLORS[item.muscle_group] + '33' }]}>
          <Text style={[styles.groupBadgeText, { color: GROUP_COLORS[item.muscle_group] }]}>
            {item.muscle_group}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.root}>
      <TextInput
        style={styles.search}
        value={search}
        onChangeText={setSearch}
        placeholder="Search exercises..."
        placeholderTextColor={colors.text.muted}
      />

      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.chip, filter === f && styles.chipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.brand.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>No exercises found.</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.primary },
  search: {
    margin: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.bg.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text.primary,
    fontSize: typography.base,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  filterRow: { flexDirection: 'row', paddingHorizontal: spacing.lg, gap: spacing.sm, marginBottom: spacing.sm },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.brand.primary, borderColor: colors.brand.primary },
  chipText: { color: colors.text.secondary, fontSize: typography.sm },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing['2xl'] },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemLeft: { flex: 1, marginRight: spacing.sm },
  itemName: { color: colors.text.primary, fontSize: typography.base },
  itemMuscles: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  groupBadge: { borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  groupBadgeText: { fontSize: typography.xs, fontWeight: '600', textTransform: 'uppercase' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 40 },
});
