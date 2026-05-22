import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, Alert, Linking,
} from 'react-native';
import * as Location from 'expo-location';
import { supabase } from '../../../../lib/supabase';
import { colors, typography, spacing } from '../../../../constants/theme';
import Button from '../../../../components/ui/Button';
import { useFindNearbyUsers, useSendBuddyRequest } from '../../../../hooks/useBuddies';
import type { NearbyUser, PrimaryGoal, ExperienceLevel } from '../../../../types/database';

const GOAL_LABELS: Record<PrimaryGoal, string> = {
  build_muscle: 'Build Muscle',
  lose_fat: 'Lose Fat',
  maintain: 'Maintain',
  improve_fitness: 'Fitness',
};

const RADIUS_OPTIONS = [1000, 5000, 10000] as const;
const RADIUS_LABELS: Record<number, string> = { 1000: '1 km', 5000: '5 km', 10000: '10 km' };

function formatDistance(meters: number, precision: string): string {
  const rounded = precision === 'approx' ? Math.round(meters / 500) * 500 : Math.round(meters);
  return rounded >= 1000 ? `${(rounded / 1000).toFixed(1)} km away` : `${rounded} m away`;
}

function Initials({ name, size = 44 }: { name: string; size?: number }) {
  const safeName = name || '?';
  const initials = safeName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={styles.avatarText}>{initials}</Text>
    </View>
  );
}

export default function BuddyFinderScreen() {
  const [permissionStatus, setPermissionStatus] = useState<'checking' | 'granted' | 'denied'>('checking');
  const [radius, setRadius] = useState<number>(5000);
  const [goalFilter, setGoalFilter] = useState<PrimaryGoal | null>(null);
  const [myCoords, setMyCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const { data: users = [], isFetching } = useFindNearbyUsers(myCoords, radius, goalFilter);
  const sendRequest = useSendBuddyRequest();

  useEffect(() => {
    requestPermissionAndLoad();
  }, []);

  async function requestPermissionAndLoad() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setPermissionStatus('denied');
      return;
    }
    setPermissionStatus('granted');
    await updateLocationAndFetch();
  }

  async function updateLocationAndFetch() {
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude: lat, longitude: lng } = pos.coords;
      setMyCoords({ lat, lng });

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('users').update({
          location: `POINT(${lng} ${lat})`,
        }).eq('id', user.id);
      }
    } catch {
      Alert.alert('Location error', 'Could not get your location. Please try again.');
      setPermissionStatus('denied');
    }
  }


  if (permissionStatus === 'checking') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.brand.primary} />
      </View>
    );
  }

  if (permissionStatus === 'denied') {
    return (
      <View style={styles.centered}>
        <Text style={styles.permissionIcon}>📍</Text>
        <Text style={styles.permissionTitle}>Location Access Needed</Text>
        <Text style={styles.permissionBody}>
          Mayari needs your location to show nearby gym buddies. Your exact location is never shared — only approximate distance.
        </Text>
        <Button label="Open Settings" onPress={() => Linking.openSettings()} style={styles.openSettingsBtn} />
        <Button
          label="Try Again"
          variant="outline"
          onPress={() => { setPermissionStatus('checking'); requestPermissionAndLoad(); }}
          style={styles.retryBtn}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Radius filter */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Radius</Text>
        <View style={styles.chipRow}>
          {RADIUS_OPTIONS.map(r => (
            <TouchableOpacity
              key={r}
              style={[styles.chip, radius === r && styles.chipActive]}
              onPress={() => setRadius(r)}
            >
              <Text style={[styles.chipText, radius === r && styles.chipTextActive]}>
                {RADIUS_LABELS[r]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Goal filter */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Goal</Text>
        <View style={styles.chipRow}>
          <TouchableOpacity
            style={[styles.chip, goalFilter === null && styles.chipActive]}
            onPress={() => setGoalFilter(null)}
          >
            <Text style={[styles.chipText, goalFilter === null && styles.chipTextActive]}>All</Text>
          </TouchableOpacity>
          {(Object.keys(GOAL_LABELS) as PrimaryGoal[]).map(g => (
            <TouchableOpacity
              key={g}
              style={[styles.chip, goalFilter === g && styles.chipActive]}
              onPress={() => setGoalFilter(g)}
            >
              <Text style={[styles.chipText, goalFilter === g && styles.chipTextActive]}>
                {GOAL_LABELS[g]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isFetching ? (
        <ActivityIndicator color={colors.brand.primary} style={styles.listLoader} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={u => u.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Walang malapit na gym buddy. Try increasing the radius!</Text>
          }
          renderItem={({ item }) => {
            const sent = sentRequests.has(item.id);
            return (
              <View style={styles.userCard}>
                <Initials name={item.display_name} />
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{item.display_name}</Text>
                  <Text style={styles.userMeta}>
                    {GOAL_LABELS[item.primary_goal]}  ·  {item.experience_level}
                  </Text>
                  <Text style={styles.userMeta}>
                    {item.workout_days?.length ?? 0} days/week  ·  {formatDistance(item.distance_m, item.location_precision)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.requestBtn, sent && styles.requestBtnSent]}
                  onPress={() => {
                    if (sent) return;
                    sendRequest.mutate(item.id, {
                      onSuccess: () => setSentRequests(prev => new Set([...prev, item.id])),
                      onError: (e) => Alert.alert('Error', e instanceof Error ? e.message : 'Could not send request.'),
                    });
                  }}
                  disabled={sent || sendRequest.isPending}
                >
                  <Text style={[styles.requestBtnText, sent && styles.requestBtnTextSent]}>
                    {sent ? 'Sent ✓' : 'Connect'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, backgroundColor: colors.bg.primary },
  permissionIcon: { fontSize: 48, marginBottom: spacing.md },
  permissionTitle: { color: colors.text.primary, fontSize: typography.xl, fontWeight: '700', textAlign: 'center', marginBottom: spacing.sm },
  permissionBody: { color: colors.text.secondary, fontSize: typography.base, textAlign: 'center', lineHeight: 22 },
  openSettingsBtn: { marginTop: spacing.lg },
  retryBtn: { marginTop: spacing.sm },
  filterSection: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  filterLabel: { color: colors.text.secondary, fontSize: typography.xs, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg.secondary,
  },
  chipActive: { borderColor: colors.brand.primary, backgroundColor: colors.brand.primary + '33' },
  chipText: { color: colors.text.secondary, fontSize: typography.sm },
  chipTextActive: { color: colors.brand.primary, fontWeight: '700' },
  listLoader: { marginTop: spacing.xl },
  list: { padding: spacing.md, gap: spacing.sm },
  emptyText: { color: colors.text.muted, fontSize: typography.sm, textAlign: 'center', marginTop: spacing.xl },
  userCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.bg.secondary,
    borderRadius: 16, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  avatar: { backgroundColor: colors.bg.elevated, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.brand.primary + '66' },
  avatarText: { color: colors.brand.primary, fontWeight: '700', fontSize: typography.base },
  userInfo: { flex: 1 },
  userName: { color: colors.text.primary, fontSize: typography.base, fontWeight: '700' },
  userMeta: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  requestBtn: {
    backgroundColor: colors.brand.primary,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8,
  },
  requestBtnSent: { backgroundColor: colors.bg.elevated, borderWidth: 1, borderColor: colors.border },
  requestBtnText: { color: '#fff', fontSize: typography.sm, fontWeight: '700' },
  requestBtnTextSent: { color: colors.text.muted },
});
