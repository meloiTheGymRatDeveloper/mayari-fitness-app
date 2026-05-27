import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../stores/authStore';
import { colors, typography, spacing } from '../../../constants/theme';

interface Stats {
  workoutStreak: number;
  nutritionStreak: number;
  buddyCount: number;
}

const NAV_SECTIONS = [
  {
    label: 'PROGRESS',
    items: [
      { label: 'Body Measurements', route: '/(tabs)/profile/measurements', emoji: '📊' },
      { label: 'Progress Charts', route: '/(tabs)/profile/progress', emoji: '📈' },
    ],
  },
  {
    label: 'NUTRITION',
    items: [
      { label: 'Calorie & Macro Goals', route: '/(tabs)/profile/goals', emoji: '🎯' },
    ],
  },
  {
    label: 'SOCIAL',
    items: [
      { label: 'Gym Buddy Finder', route: '/(tabs)/profile/buddies/find', emoji: '🤝' },
      { label: 'My Buddies', route: '/(tabs)/profile/buddies/list', emoji: '💬' },
    ],
  },
  {
    label: 'ACCOUNT',
    items: [
      { label: 'Referrals', route: '/(tabs)/profile/referral', emoji: '🎁' },
      { label: 'Subscription', route: '/(tabs)/profile/subscription', emoji: '💳' },
      { label: 'Settings', route: '/(tabs)/profile/settings', emoji: '⚙️' },
    ],
  },
];

export default function MoreScreen() {
  const router = useRouter();
  const { profile, clear, updateAvatar } = useAuthStore();
  const [stats, setStats] = useState<Stats>({ workoutStreak: 0, nutritionStreak: 0, buddyCount: 0 });
  const [loadingStats, setLoadingStats] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setLoadingStats(true);
    const [streakRes, buddyRes] = await Promise.all([
      supabase.from('streaks').select('workout_current, nutrition_current').eq('user_id', user.id).maybeSingle(),
      supabase.from('buddy_connections').select('id', { count: 'exact', head: true }).or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`),
    ]);
    setStats({
      workoutStreak: streakRes.data?.workout_current ?? 0,
      nutritionStreak: streakRes.data?.nutrition_current ?? 0,
      buddyCount: buddyRes.count ?? 0,
    });
    setLoadingStats(false);
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

  const workoutStreak = stats.workoutStreak;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
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
        <View style={styles.headerText}>
          <Text style={styles.displayName}>{profile?.display_name ?? profile?.username ?? ''}</Text>
          <Text style={styles.username}>@{profile?.username ?? ''} · {profile?.subscription_status ?? 'free'}</Text>
        </View>
      </View>

      {/* Streak banner */}
      {loadingStats ? (
        <ActivityIndicator color={colors.brand.primary} style={{ marginBottom: spacing.md }} />
      ) : workoutStreak > 0 ? (
        <TouchableOpacity style={styles.streakBanner} onPress={() => router.push('/(tabs)/profile/streaks' as never)}>
          <Text style={styles.streakEmoji}>🔥</Text>
          <View>
            <Text style={styles.streakText}>{workoutStreak} days na! Tuloy lang!</Text>
            <Text style={styles.streakSub}>Workout streak · tap to see details</Text>
          </View>
        </TouchableOpacity>
      ) : null}

      {/* Nav sections */}
      {NAV_SECTIONS.map((section) => (
        <View key={section.label} style={styles.section}>
          <Text style={styles.sectionLabel}>{section.label}</Text>
          <View style={styles.sectionCard}>
            {section.items.map((item, idx) => (
              <TouchableOpacity
                key={item.label}
                style={[styles.navRow, idx < section.items.length - 1 && styles.navRowBorder]}
                onPress={() => router.push(item.route as never)}
              >
                <Text style={styles.navEmoji}>{item.emoji}</Text>
                <Text style={styles.navLabel}>{item.label}</Text>
                <Text style={styles.navChevron}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
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
  container: { paddingHorizontal: spacing.lg, paddingTop: spacing['2xl'], paddingBottom: spacing['2xl'] },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  avatarWrap: { position: 'relative' },
  avatarEditBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: colors.brand.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: colors.bg.primary,
  },
  avatar: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: colors.brand.primary },
  avatarPlaceholder: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: colors.bg.elevated, borderWidth: 2, borderColor: colors.brand.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitials: { color: colors.brand.primary, fontSize: typography.xl, fontWeight: '700' },
  headerText: { flex: 1 },
  displayName: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '700' },
  username: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  streakBanner: {
    backgroundColor: colors.bg.elevated, borderRadius: 12,
    padding: spacing.md, borderWidth: 1, borderColor: colors.warning,
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md,
  },
  streakEmoji: { fontSize: 24 },
  streakText: { color: colors.warning, fontSize: typography.sm, fontWeight: '700' },
  streakSub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  section: { marginBottom: spacing.md },
  sectionLabel: {
    color: colors.text.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1,
    textTransform: 'uppercase', marginBottom: spacing.xs,
  },
  sectionCard: {
    backgroundColor: colors.bg.secondary, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  navRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
  },
  navRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  navEmoji: { fontSize: 18 },
  navLabel: { flex: 1, color: colors.text.primary, fontSize: typography.base },
  navChevron: { color: colors.text.muted, fontSize: typography.xl },
  signOutBtn: {
    borderRadius: 12, paddingVertical: spacing.md, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border, marginTop: spacing.sm,
  },
  signOutText: { color: colors.error, fontSize: typography.base, fontWeight: '600' },
});
