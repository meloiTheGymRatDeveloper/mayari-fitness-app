import { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAdminSubmissions, useApproveSubmission, useRejectSubmission } from '../../../../hooks/useNutrition';
import type { FoodSubmission } from '../../../../types/database';
import { colors, typography, spacing, fonts } from '../../../../constants/theme';

export default function AdminSubmissionsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: submissions = [], isLoading } = useAdminSubmissions();
  const approve = useApproveSubmission();
  const reject = useRejectSubmission();
  const [processingId, setProcessingId] = useState<string | null>(null);

  async function handleApprove(sub: FoodSubmission) {
    setProcessingId(sub.id);
    try {
      await approve.mutateAsync(sub);
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not approve');
    } finally {
      setProcessingId(null);
    }
  }

  function handleReject(sub: FoodSubmission) {
    Alert.prompt(
      'Reject submission',
      'Reason (optional):',
      async (reason) => {
        setProcessingId(sub.id);
        try {
          await reject.mutateAsync({ id: sub.id, reason: reason ?? '' });
        } catch (e: unknown) {
          Alert.alert('Error', e instanceof Error ? e.message : 'Could not reject');
        } finally {
          setProcessingId(null);
        }
      },
      'plain-text',
      '',
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Food Submissions</Text>
        <Text style={styles.count}>{submissions.length} pending</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.brand.primary} style={{ marginTop: 40 }} />
      ) : submissions.length === 0 ? (
        <Text style={styles.empty}>No pending submissions.</Text>
      ) : (
        <FlatList
          data={submissions}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const busy = processingId === item.id;
            return (
              <View style={styles.card}>
                <Text style={styles.foodName}>{item.name}</Text>
                {item.brand && <Text style={styles.brand}>{item.brand}</Text>}
                {item.barcode && <Text style={styles.meta}>Barcode: {item.barcode}</Text>}
                <Text style={styles.macros}>
                  {item.calories_per_100g} kcal · {item.protein_per_100g}g P · {item.carbs_per_100g}g C · {item.fat_per_100g}g F
                </Text>
                <Text style={styles.meta}>
                  {new Date(item.created_at).toLocaleDateString('en-PH')}
                </Text>
                <View style={styles.btnRow}>
                  <TouchableOpacity
                    style={[styles.approveBtn, busy && styles.btnDisabled]}
                    onPress={() => handleApprove(item)}
                    disabled={busy}
                  >
                    <Text style={styles.approveBtnText}>{busy ? '...' : '✓ Approve'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.rejectBtn, busy && styles.btnDisabled]}
                    onPress={() => handleReject(item)}
                    disabled={busy}
                  >
                    <Text style={styles.rejectBtnText}>✕ Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.primary },
  header: { padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  back: { color: colors.brand.primary, fontSize: typography.base, marginBottom: spacing.xs },
  title: { color: colors.text.primary, fontSize: typography.xl, fontFamily: fonts.extrabold },
  count: { color: colors.text.muted, fontSize: typography.sm, marginTop: 2 },
  list: { padding: spacing.lg, gap: spacing.md },
  card: {
    backgroundColor: colors.bg.secondary, borderRadius: 12,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border, gap: spacing.xs,
  },
  foodName: { color: colors.text.primary, fontSize: typography.base, fontFamily: fonts.semibold },
  brand: { color: colors.text.muted, fontSize: typography.sm },
  macros: { color: colors.brand.secondary, fontSize: typography.sm },
  meta: { color: colors.text.muted, fontSize: typography.xs },
  btnRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  approveBtn: {
    flex: 1, backgroundColor: colors.success, borderRadius: 8,
    paddingVertical: spacing.sm, alignItems: 'center',
  },
  approveBtnText: { color: '#fff', fontFamily: fonts.bold, fontSize: typography.sm },
  rejectBtn: {
    flex: 1, borderWidth: 1, borderColor: colors.error, borderRadius: 8,
    paddingVertical: spacing.sm, alignItems: 'center',
  },
  rejectBtnText: { color: colors.error, fontFamily: fonts.semibold, fontSize: typography.sm },
  btnDisabled: { opacity: 0.5 },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 60 },
});
