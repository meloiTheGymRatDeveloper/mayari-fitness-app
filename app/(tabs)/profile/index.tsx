import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../stores/authStore';
import { colors, typography, spacing, fonts, labelStyle } from '../../../constants/theme';
import GearSection from '../../../components/profile/GearSection';

interface Stats {
  workoutStreak: number;
  nutritionStreak: number;
  buddyCount: number;
  totalWorkouts: number;
  totalXp: number;
}

type NavItem = { label: string; route: string; emoji: string; badge?: string };
type NavSection = { label: string; items: NavItem[] };

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Body',
    items: [
      { label: 'Measurements', route: '/(tabs)/profile/measurements', emoji: '📊' },
      { label: 'Progress Charts', route: '/(tabs)/profile/progress', emoji: '📈' },
    ],
  },
  {
    label: 'Social',
    items: [
      { label: 'Find Gym Buddies', route: '/(tabs)/profile/buddies/find', emoji: '🤝' },
      { label: 'My Buddies', route: '/(tabs)/profile/buddies/list', emoji: '💬' },
    ],
  },
  {
    label: 'Account',
    items: [
      { label: 'Referrals', route: '/(tabs)/profile/referral', emoji: '🎁', badge: '₱20 off' },
      { label: 'Subscription', route: '/(tabs)/profile/subscription', emoji: '💳' },
      { label: 'Settings', route: '/(tabs)/profile/settings', emoji: '⚙️' },
    ],
  },
];

export default function MoreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, clear, updateAvatar } = useAuthStore();
  const [stats, setStats] = useState<Stats>({ workoutStreak: 0, nutritionStreak: 0, buddyCount: 0, totalWorkouts: 0, totalXp: 0 });
  const [loadingStats, setLoadingStats] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setLoadingStats(true);
    try {
      const [streakRes, buddyRes, sessionRes] = await Promise.all([
        supabase.from('streaks').select('workout_current, nutrition_current').eq('user_id', user.id).maybeSingle(),
        supabase.from('buddy_connections').select('id', { count: 'exact', head: true }).or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`),
        supabase.from('workout_sessions').select('xp_earned').eq('user_id', user.id).limit(500),
      ]);
      const sessions = sessionRes.data ?? [];
      setStats({
        workoutStreak: streakRes.data?.workout_current ?? 0,
        nutritionStreak: streakRes.data?.nutrition_current ?? 0,
        buddyCount: buddyRes.count ?? 0,
        totalWorkouts: sessions.length,
        totalXp: sessions.reduce((acc, s) => acc + (s.xp_earned ?? 0), 0),
      });
    } catch {
      // silently degrade — stats show 0
    } finally {
      setLoadingStats(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    clear();
  }

  async function handleAvatarPress() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library to set a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      const ext = asset.uri.split('.').pop() ?? 'jpg';
      const path = `${user.id}/avatar.${ext}`;

      const response = await fetch(asset.uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { contentType: asset.mimeType ?? 'image/jpeg', upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      await updateAvatar(publicUrl);
    } catch (e: unknown) {
      Alert.alert('Upload failed', e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setUploading(false);
    }
  }

  const initials = (profile?.display_name ?? profile?.username ?? '?')
    .split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  const isPro = ['active', 'achiever', 'beta'].includes(profile?.subscription_status ?? 'free');

  const statChips: { label: string; emoji: string; onPress: (() => void) | undefined }[] = [
    { label: `${stats.workoutStreak} day streak`, emoji: '🔥', onPress: () => router.push('/(tabs)/profile/streaks' as never) },
    { label: `${stats.totalWorkouts} workouts`, emoji: '💪', onPress: undefined },
    { label: `${stats.totalXp} XP`, emoji: '⭐', onPress: undefined },
  ];

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing['2xl'] }]}>
      {/* Header row */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.avatarWrap} onPress={handleAvatarPress} disabled={uploading}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}
          <View style={styles.avatarEditBadge}>
            {uploading
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="camera" size={12} color="#fff" />}
          </View>
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <Text style={styles.displayName}>{profile?.display_name ?? profile?.username ?? ''}</Text>
          <View style={styles.tierRow}>
            <Text style={styles.usernameText}>@{profile?.username ?? ''}</Text>
            <View style={[
              styles.tierBadge,
              isPro ? styles.tierPro : styles.tierFree,
            ]}>
              <Text style={styles.tierText}>
                {isPro ? 'Pro' : 'Free'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Stats chips */}
      {loadingStats ? (
        <ActivityIndicator color={colors.brand.primary} style={{ marginBottom: spacing.md }} />
      ) : (
        <View style={styles.statsRow}>
          {statChips.map(({ label, emoji, onPress }) => (
            <TouchableOpacity
              key={label}
              style={styles.statChip}
              onPress={onPress}
              disabled={!onPress}
              activeOpacity={onPress ? 0.7 : 1}
            >
              <Text style={styles.statEmoji}>{emoji}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Nav sections */}
      {NAV_SECTIONS.map((section) => (
        <View key={section.label}>
          <View style={styles.section}>
            <Text style={labelStyle}>{section.label}</Text>
            <View style={styles.sectionCard}>
              {section.items.map((item, idx) => (
                <TouchableOpacity
                  key={item.label}
                  style={[styles.navRow, idx < section.items.length - 1 && styles.navRowBorder]}
                  onPress={() => router.push(item.route as never)}
                >
                  <Text style={styles.navEmoji}>{item.emoji}</Text>
                  <Text style={styles.navLabel}>{item.label}</Text>
                  {item.badge && (
                    <View style={styles.navBadge}>
                      <Text style={styles.navBadgeText}>{item.badge}</Text>
                    </View>
                  )}
                  <Text style={styles.navChevron}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          {section.label === 'Social' && <GearSection />}
        </View>
      ))}

      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg.primary },
  container: { paddingHorizontal: spacing.lg, paddingBottom: spacing['2xl'] },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  avatarWrap: { position: 'relative' },
  avatarEditBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: colors.brand.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: colors.bg.primary,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: colors.brand.gold },
  avatarPlaceholder: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.bg.elevated,
    borderWidth: 2,
    borderColor: colors.brand.gold,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitials: { color: colors.brand.gold, fontSize: typography.xl, fontFamily: fonts.bold },
  headerRight: { flex: 1 },
  displayName: { color: colors.text.primary, fontSize: typography.lg, fontFamily: fonts.bold },
  tierRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 2 },
  usernameText: { color: colors.text.muted, fontSize: typography.xs },
  tierBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  tierPro: { backgroundColor: colors.brand.secondary + '30', borderWidth: 1, borderColor: colors.brand.secondary },
  tierFree: { backgroundColor: colors.bg.elevated, borderWidth: 1, borderColor: colors.border },
  tierText: { fontSize: 9, fontFamily: fonts.bold, color: colors.text.secondary },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.brand.gold,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  statEmoji: { fontSize: 14 },
  statLabel: { color: colors.text.secondary, fontSize: 10, fontFamily: fonts.medium },
  section: { marginBottom: spacing.md },
  sectionCard: {
    backgroundColor: colors.bg.secondary, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  navRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
  },
  navRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  navEmoji: { fontSize: 18 },
  navLabel: { flex: 1, color: colors.text.primary, fontSize: typography.base },
  navBadge: {
    backgroundColor: colors.brand.gold + '25',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: spacing.xs,
  },
  navBadgeText: { color: colors.brand.gold, fontSize: 9, fontFamily: fonts.bold },
  navChevron: { color: colors.text.muted, fontSize: typography.xl },
  signOutBtn: {
    borderRadius: 12, paddingVertical: spacing.md, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border, marginTop: spacing.sm,
  },
  signOutText: { color: colors.error, fontSize: typography.base, fontFamily: fonts.semibold },
});
