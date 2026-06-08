import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity,
  Alert, TextInput, ActivityIndicator, Modal, FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../stores/authStore';
import { colors, typography, spacing, fonts, labelStyle } from '../../../constants/theme';
import Button from '../../../components/ui/Button';

function SectionHeader({ label }: { label: string }) {
  return <Text style={styles.sectionHeader}>{label}</Text>;
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      {children}
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { profile, fetchProfile, clear } = useAuthStore();

  const [mealStyle, setMealStyle] = useState<'filipino' | 'generic'>(profile?.meal_time_style ?? 'filipino');
  const [unitsPref, setUnitsPref] = useState<'metric' | 'imperial'>(profile?.units_pref ?? 'metric');
  const [showNetCarbs, setShowNetCarbs] = useState(profile?.net_carbs_display ?? true);
  const [workoutNotif, setWorkoutNotif] = useState(profile?.notif_workout_enabled ?? true);
  const [weeklySummary, setWeeklySummary] = useState(profile?.notif_weekly_summary ?? true);
  const [streakAlert, setStreakAlert] = useState(profile?.notif_streak_alert ?? true);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(profile?.display_name ?? '');
  const [savingName, setSavingName] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [workoutTime, setWorkoutTime] = useState(profile?.notif_workout_time ?? '18:00');
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  function formatTime(t: string): string {
    const h = parseInt(t.split(':')[0], 10);
    const period = h < 12 ? 'AM' : 'PM';
    const hour12 = h % 12 || 12;
    return `${hour12}:00 ${period}`;
  }

  const TIME_OPTIONS = Array.from({ length: 17 }, (_, i) => {
    const h = i + 6;
    const value = `${String(h).padStart(2, '0')}:00`;
    return { value, label: formatTime(value) };
  });

  async function saveField(field: Record<string, unknown>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('users').update(field).eq('id', user.id);
    await fetchProfile(user.id);
  }

  async function saveName() {
    if (!newName.trim()) { Alert.alert('Name required', 'Display name cannot be empty.'); return; }
    setSavingName(true);
    await saveField({ display_name: newName.trim() });
    setSavingName(false);
    setEditingName(false);
  }

  async function savePassword() {
    if (newPass.length < 8) { Alert.alert('Too short', 'Password must be at least 8 characters.'); return; }
    if (newPass !== confirmPass) { Alert.alert('Mismatch', 'New passwords do not match.'); return; }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPass });
    setSavingPassword(false);
    if (error) { Alert.alert('Error', error.message); return; }
    Alert.alert('Password updated', 'Your password has been changed.');
    setChangingPassword(false);
    setNewPass(''); setConfirmPass('');
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    clear();
  }

  function handleDeleteAccount() {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => { setDeleteConfirmText(''); setDeleteModalVisible(true); },
        },
      ]
    );
  }

  async function confirmDelete() {
    if (deleteConfirmText.trim() !== 'DELETE') {
      Alert.alert('Type DELETE exactly', 'Please type DELETE in all caps to confirm.');
      return;
    }
    setDeleting(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setDeleting(false); return; }
    const { error } = await supabase.functions.invoke('delete-account', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    setDeleting(false);
    if (error) { Alert.alert('Error', 'Could not delete account. Please try again.'); return; }
    setDeleteModalVisible(false);
    await supabase.auth.signOut();
    clear();
  }

  // Suppress unused variable warning — router is available for future navigation needs
  void router;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.screenTitle}>Settings</Text>

      <SectionHeader label="Nutrition" />
      <View style={styles.card}>
        <SettingRow label="Meal Time Style">
          <View style={styles.segmentControl}>
            <TouchableOpacity
              style={[styles.segment, mealStyle === 'filipino' && styles.segmentActive]}
              onPress={() => { setMealStyle('filipino'); saveField({ meal_time_style: 'filipino' }); }}
            >
              <Text style={[styles.segmentText, mealStyle === 'filipino' && styles.segmentTextActive]}>Filipino</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segment, mealStyle === 'generic' && styles.segmentActive]}
              onPress={() => { setMealStyle('generic'); saveField({ meal_time_style: 'generic' }); }}
            >
              <Text style={[styles.segmentText, mealStyle === 'generic' && styles.segmentTextActive]}>Generic</Text>
            </TouchableOpacity>
          </View>
        </SettingRow>
        <View style={styles.divider} />
        <SettingRow label="Show Net Carbs">
          <Switch
            value={showNetCarbs}
            onValueChange={v => { setShowNetCarbs(v); saveField({ net_carbs_display: v }); }}
            trackColor={{ false: colors.border, true: colors.brand.primary }}
            thumbColor="#fff"
          />
        </SettingRow>
        <View style={styles.divider} />
        <SettingRow label="Units">
          <View style={styles.segmentControl}>
            <TouchableOpacity
              style={[styles.segment, unitsPref === 'metric' && styles.segmentActive]}
              onPress={() => { setUnitsPref('metric'); saveField({ units_pref: 'metric' }); }}
            >
              <Text style={[styles.segmentText, unitsPref === 'metric' && styles.segmentTextActive]}>Metric</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segment, unitsPref === 'imperial' && styles.segmentActive]}
              onPress={() => { setUnitsPref('imperial'); saveField({ units_pref: 'imperial' }); }}
            >
              <Text style={[styles.segmentText, unitsPref === 'imperial' && styles.segmentTextActive]}>Imperial</Text>
            </TouchableOpacity>
          </View>
        </SettingRow>
      </View>

      <SectionHeader label="Notifications" />
      <View style={styles.card}>
        <SettingRow label="Workout Reminder">
          <Switch value={workoutNotif}
            onValueChange={v => { setWorkoutNotif(v); saveField({ notif_workout_enabled: v }); }}
            trackColor={{ false: colors.border, true: colors.brand.primary }} thumbColor="#fff" />
        </SettingRow>
        {workoutNotif && (
          <>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => setTimePickerVisible(true)}
            >
              <Text style={styles.settingLabel}>Reminder Time</Text>
              <View style={styles.timeChip}>
                <Text style={styles.timeChipText}>{formatTime(workoutTime)}</Text>
                <Text style={styles.chevron}>›</Text>
              </View>
            </TouchableOpacity>
          </>
        )}
        <View style={styles.divider} />
        <SettingRow label="Weekly Summary">
          <Switch value={weeklySummary}
            onValueChange={v => { setWeeklySummary(v); saveField({ notif_weekly_summary: v }); }}
            trackColor={{ false: colors.border, true: colors.brand.primary }} thumbColor="#fff" />
        </SettingRow>
        <View style={styles.divider} />
        <SettingRow label="Streak Alert">
          <Switch value={streakAlert}
            onValueChange={v => { setStreakAlert(v); saveField({ notif_streak_alert: v }); }}
            trackColor={{ false: colors.border, true: colors.brand.primary }} thumbColor="#fff" />
        </SettingRow>
      </View>

      <SectionHeader label="Account" />
      <View style={styles.card}>
        <View style={styles.settingBlock}>
          <Text style={styles.settingLabel}>Display Name</Text>
          {editingName ? (
            <View style={styles.inlineEdit}>
              <TextInput
                style={styles.inlineInput}
                value={newName}
                onChangeText={setNewName}
                autoFocus
                placeholderTextColor={colors.text.muted}
              />
              <TouchableOpacity style={styles.saveChip} onPress={saveName} disabled={savingName}>
                {savingName
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.saveChipText}>Save</Text>}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => { setNewName(profile?.display_name ?? ''); setEditingName(true); }}>
              <Text style={styles.editLink}>{profile?.display_name ?? 'Set name'} (Edit)</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.divider} />
        <View style={styles.settingBlock}>
          <Text style={styles.settingLabel}>Password</Text>
          {changingPassword ? (
            <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
              <TextInput
                style={styles.inlineInput}
                placeholder="New password"
                placeholderTextColor={colors.text.muted}
                secureTextEntry
                value={newPass}
                onChangeText={setNewPass}
              />
              <TextInput
                style={styles.inlineInput}
                placeholder="Confirm new password"
                placeholderTextColor={colors.text.muted}
                secureTextEntry
                value={confirmPass}
                onChangeText={setConfirmPass}
              />
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Button label="Cancel" variant="outline" onPress={() => setChangingPassword(false)} style={{ flex: 1 }} />
                <Button label="Update" onPress={savePassword} loading={savingPassword} style={{ flex: 1 }} />
              </View>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setChangingPassword(true)}>
              <Text style={styles.editLink}>Change Password</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.divider} />
        <Button label="Sign Out" variant="outline" onPress={handleSignOut} style={styles.signOutBtn} />
      </View>

      <View style={styles.dangerCard}>
        <Text style={styles.dangerTitle}>Danger Zone</Text>
        <Text style={styles.dangerDesc}>Permanently delete your account and all data. This cannot be undone.</Text>
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount}>
          <Text style={styles.deleteBtnText}>Delete Account</Text>
        </TouchableOpacity>
      </View>
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, styles.deleteModalSheet]}>
            <Text style={styles.deleteModalTitle}>Confirm Account Deletion</Text>
            <Text style={styles.deleteModalBody}>
              This will permanently delete your account and all data. Type{' '}
              <Text style={{ color: colors.error, fontFamily: fonts.bold }}>DELETE</Text>
              {' '}to confirm.
            </Text>
            <TextInput
              style={[styles.inlineInput, styles.deleteModalInput]}
              placeholder="Type DELETE here"
              placeholderTextColor={colors.text.muted}
              autoCapitalize="characters"
              autoCorrect={false}
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
            />
            <View style={styles.deleteModalActions}>
              <Button
                label="Cancel"
                variant="outline"
                onPress={() => setDeleteModalVisible(false)}
                style={{ flex: 1 }}
              />
              <TouchableOpacity
                style={[styles.deleteBtn, { flex: 1, marginTop: 0 }]}
                onPress={confirmDelete}
                disabled={deleting}
              >
                {deleting
                  ? <ActivityIndicator size="small" color={colors.error} />
                  : <Text style={styles.deleteBtnText}>Delete Forever</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={timePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTimePickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setTimePickerVisible(false)}
        >
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Reminder Time</Text>
            <FlatList
              data={TIME_OPTIONS}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.timeOption, workoutTime === item.value && styles.timeOptionSelected]}
                  onPress={() => {
                    setWorkoutTime(item.value);
                    saveField({ notif_workout_time: item.value });
                    setTimePickerVisible(false);
                  }}
                >
                  <Text style={[styles.timeOptionText, workoutTime === item.value && styles.timeOptionTextSelected]}>
                    {item.label}
                  </Text>
                  {workoutTime === item.value && (
                    <Text style={styles.timeOptionCheck}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.divider} />}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg.primary },
  container: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing['2xl'] },
  screenTitle: { color: colors.text.primary, fontSize: typography['2xl'], fontFamily: fonts.extrabold, marginBottom: spacing.lg },
  sectionHeader: {
    ...labelStyle,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  card: {
    backgroundColor: colors.bg.secondary, borderRadius: 16,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
  },
  settingBlock: { paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  settingLabel: { color: colors.text.primary, fontSize: typography.base, fontFamily: fonts.medium },
  divider: { height: 1, backgroundColor: colors.border },
  segmentControl: { flexDirection: 'row', backgroundColor: colors.bg.primary, borderRadius: 10, overflow: 'hidden' },
  segment: { paddingHorizontal: 12, paddingVertical: 6 },
  segmentActive: { backgroundColor: colors.brand.primary },
  segmentText: { color: colors.text.secondary, fontSize: typography.xs, fontFamily: fonts.semibold },
  segmentTextActive: { color: '#fff' },
  inlineEdit: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  inlineInput: {
    flex: 1, backgroundColor: colors.bg.primary, borderRadius: 10, paddingHorizontal: 12,
    paddingVertical: 8, color: colors.text.primary, fontSize: typography.base,
    borderWidth: 1, borderColor: colors.border,
  },
  saveChip: { backgroundColor: colors.brand.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  saveChipText: { color: '#fff', fontFamily: fonts.bold, fontSize: typography.sm },
  editLink: { color: colors.brand.primary, fontSize: typography.sm, fontFamily: fonts.semibold, marginTop: spacing.xs },
  signOutBtn: { margin: spacing.md },
  dangerCard: {
    borderRadius: 16, borderWidth: 2, borderColor: colors.error + '66',
    padding: spacing.md, marginTop: spacing.lg,
  },
  dangerTitle: { color: colors.error, fontSize: typography.base, fontFamily: fonts.bold, marginBottom: spacing.xs },
  dangerDesc: { color: colors.text.secondary, fontSize: typography.sm, fontFamily: fonts.regular, marginBottom: spacing.md },
  deleteBtn: {
    backgroundColor: colors.error + '22', borderRadius: 12, padding: spacing.md,
    alignItems: 'center', borderWidth: 1, borderColor: colors.error + '44',
  },
  deleteBtnText: { color: colors.error, fontSize: typography.base, fontFamily: fonts.bold },
  timeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.bg.primary, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: colors.border,
  },
  timeChipText: { color: colors.brand.primary, fontSize: typography.sm, fontFamily: fonts.semibold },
  chevron: { color: colors.text.muted, fontSize: 18, lineHeight: 20 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.bg.elevated,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: spacing.lg, paddingBottom: spacing['2xl'],
    borderWidth: 1, borderColor: colors.border,
    maxHeight: '70%',
  },
  modalTitle: {
    color: colors.text.primary, fontSize: typography.lg, fontFamily: fonts.bold,
    textAlign: 'center', marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  timeOption: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  timeOptionSelected: { backgroundColor: colors.brand.primary + '18' },
  timeOptionText: { color: colors.text.primary, fontSize: typography.base, fontFamily: fonts.regular },
  timeOptionTextSelected: { color: colors.brand.primary, fontFamily: fonts.semibold },
  timeOptionCheck: { color: colors.brand.primary, fontSize: typography.base, fontFamily: fonts.bold },
  deleteModalSheet: {
    marginHorizontal: spacing.lg,
    borderRadius: 20,
    paddingBottom: spacing.lg,
  },
  deleteModalTitle: {
    color: colors.error,
    fontSize: typography.lg,
    fontFamily: fonts.bold,
    textAlign: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  deleteModalBody: {
    color: colors.text.secondary,
    fontSize: typography.sm,
    fontFamily: fonts.regular,
    textAlign: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    lineHeight: 20,
  },
  deleteModalInput: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  deleteModalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
});
