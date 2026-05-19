import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../../../lib/supabase';
import { colors, typography, spacing } from '../../../../constants/theme';
import Button from '../../../../components/ui/Button';
import Skeleton from '../../../../components/ui/Skeleton';
import EmptyState from '../../../../components/ui/EmptyState';
import type { BuddyRequest, BuddyConnection } from '../../../../types/database';

interface RequestWithUser extends BuddyRequest {
  user: { id: string; display_name: string; avatar_url: string | null; primary_goal: string };
}

interface ConnectionWithUser extends BuddyConnection {
  other_user: { id: string; display_name: string; avatar_url: string | null; primary_goal: string };
}

const GOAL_LABELS: Record<string, string> = {
  build_muscle: 'Build Muscle',
  lose_fat: 'Lose Fat',
  maintain: 'Maintain',
  improve_fitness: 'Improve Fitness',
};

function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const safeName = name || '?';
  const initials = safeName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={styles.avatarText}>{initials}</Text>
    </View>
  );
}

type Tab = 'requests' | 'connected';

export default function BuddyListScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('requests');
  const [incoming, setIncoming] = useState<RequestWithUser[]>([]);
  const [outgoing, setOutgoing] = useState<RequestWithUser[]>([]);
  const [connections, setConnections] = useState<ConnectionWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [outgoingExpanded, setOutgoingExpanded] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(false);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setLoading(true);

    try {
      const [incomingRes, outgoingRes, connectionsRes] = await Promise.all([
        supabase
          .from('buddy_requests')
          .select('*, user:sender_id(id, display_name, avatar_url, primary_goal)')
          .eq('receiver_id', user.id)
          .eq('status', 'pending'),
        supabase
          .from('buddy_requests')
          .select('*, user:receiver_id(id, display_name, avatar_url, primary_goal)')
          .eq('sender_id', user.id)
          .eq('status', 'pending'),
        supabase
          .from('buddy_connections')
          .select('*')
          .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`),
      ]);

      const myId = user.id;

      const connectionIds = (connectionsRes.data ?? []).map(c =>
        c.user_a_id === myId ? c.user_b_id : c.user_a_id
      );

      let userMap: Record<string, { id: string; display_name: string; avatar_url: string | null; primary_goal: string }> = {};
      if (connectionIds.length > 0) {
        const { data: buddyUsers } = await supabase
          .from('users')
          .select('id, display_name, avatar_url, primary_goal')
          .in('id', connectionIds);
        (buddyUsers ?? []).forEach(u => { userMap[u.id] = u; });
      }

      const connWithUser: ConnectionWithUser[] = (connectionsRes.data ?? []).map(c => ({
        ...c,
        other_user: userMap[c.user_a_id === myId ? c.user_b_id : c.user_a_id] ?? {
          id: '', display_name: 'Unknown', avatar_url: null, primary_goal: 'build_muscle',
        },
      }));

      setIncoming((incomingRes.data ?? []) as RequestWithUser[]);
      setOutgoing((outgoingRes.data ?? []) as RequestWithUser[]);
      setConnections(connWithUser);
    } catch {
      Alert.alert('Error', 'Could not load buddy data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function acceptRequest(requestId: string, senderId: string) {
    if (actionInProgress) return;
    setActionInProgress(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error: connError } = await supabase.from('buddy_connections').insert({
        user_a_id: user.id,
        user_b_id: senderId,
      });
      if (connError && !connError.message.includes('duplicate')) {
        Alert.alert('Error', connError.message);
        return;
      }
      const { error: reqError } = await supabase
        .from('buddy_requests')
        .update({ status: 'accepted' })
        .eq('id', requestId);
      if (reqError) { Alert.alert('Error', reqError.message); return; }
      await load();
    } finally {
      setActionInProgress(false);
    }
  }

  async function declineRequest(requestId: string) {
    if (actionInProgress) return;
    setActionInProgress(true);
    try {
      const { error } = await supabase
        .from('buddy_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);
      if (error) { Alert.alert('Error', error.message); return; }
      await load();
    } catch {
      Alert.alert('Error', 'Could not decline request. Please try again.');
    } finally {
      setActionInProgress(false);
    }
  }

  function navigateToChat(connection: ConnectionWithUser) {
    router.push(`/(tabs)/profile/buddies/chat/${connection.id}` as never);
  }

  return (
    <View style={styles.container}>
      {/* Tab bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && styles.tabActive]}
          onPress={() => setActiveTab('requests')}
        >
          <Text style={[styles.tabText, activeTab === 'requests' && styles.tabTextActive]}>
            Requests {incoming.length > 0 ? `(${incoming.length})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'connected' && styles.tabActive]}
          onPress={() => setActiveTab('connected')}
        >
          <Text style={[styles.tabText, activeTab === 'connected' && styles.tabTextActive]}>
            Connected ({connections.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.skeletonList}>
          {[0, 1, 2].map(i => (
            <View key={i} style={styles.skeletonRow}>
              <Skeleton width={44} height={44} borderRadius={22} />
              <View style={styles.skeletonTextCol}>
                <Skeleton width={140} height={16} />
                <Skeleton width={90} height={12} />
              </View>
            </View>
          ))}
        </View>
      ) : activeTab === 'requests' ? (
        <FlatList
          data={incoming}
          keyExtractor={r => r.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Walang pending requests.</Text>
          }
          ListFooterComponent={
            outgoing.length > 0 ? (
              <View style={styles.outgoingSection}>
                <TouchableOpacity
                  style={styles.outgoingHeader}
                  onPress={() => setOutgoingExpanded(e => !e)}
                >
                  <Text style={styles.outgoingTitle}>
                    Outgoing ({outgoing.length}) {outgoingExpanded ? '▲' : '▼'}
                  </Text>
                </TouchableOpacity>
                {outgoingExpanded && outgoing.map(req => (
                  <View key={req.id} style={styles.outgoingRow}>
                    <Avatar name={req.user?.display_name ?? ''} size={36} />
                    <Text style={styles.outgoingName}>{req.user?.display_name}</Text>
                    <View style={styles.pendingBadge}>
                      <Text style={styles.pendingBadgeText}>Pending ⏳</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <View style={styles.requestCard}>
              <Avatar name={item.user?.display_name ?? ''} />
              <View style={styles.requestInfo}>
                <Text style={styles.requestName}>{item.user?.display_name ?? 'Unknown'}</Text>
                <Text style={styles.requestMeta}>
                  {GOAL_LABELS[item.user?.primary_goal ?? ''] ?? ''}
                </Text>
              </View>
              <View style={styles.requestActions}>
                <Button
                  label="Accept"
                  onPress={() => acceptRequest(item.id, item.sender_id)}
                  style={styles.acceptBtn}
                />
                <Button
                  label="Decline"
                  variant="outline"
                  onPress={() => declineRequest(item.id)}
                  style={styles.declineBtn}
                />
              </View>
            </View>
          )}
        />
      ) : (
        <FlatList
          data={connections}
          keyExtractor={c => c.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              emoji="👥"
              title="Wala pang gym buddies"
              subtitle="Find people near you to train with"
              ctaLabel="Find Buddies"
              onCta={() => router.push('/(tabs)/profile/buddies/find' as never)}
            />
          }
          renderItem={({ item }) => (
            <View style={styles.connectionCard}>
              <Avatar name={item.other_user.display_name} />
              <View style={styles.connectionInfo}>
                <Text style={styles.connectionName}>{item.other_user.display_name}</Text>
                <Text style={styles.connectionMeta}>
                  {GOAL_LABELS[item.other_user.primary_goal] ?? ''}
                </Text>
              </View>
              <TouchableOpacity style={styles.chatBtn} onPress={() => navigateToChat(item)}>
                <Text style={styles.chatBtnText}>Chat 💬</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, paddingVertical: spacing.md, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.brand.primary },
  tabText: { color: colors.text.muted, fontSize: typography.sm, fontWeight: '600' },
  tabTextActive: { color: colors.brand.primary },
  skeletonList: { padding: spacing.md, gap: spacing.md },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: 16, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  skeletonTextCol: { flex: 1, gap: 6 },
  list: { padding: spacing.md, gap: spacing.sm },
  emptyText: { color: colors.text.muted, fontSize: typography.sm, textAlign: 'center', marginTop: spacing.xl },
  avatar: { backgroundColor: colors.bg.elevated, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.brand.primary + '66' },
  avatarText: { color: colors.brand.primary, fontWeight: '700', fontSize: typography.sm },
  requestCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.bg.secondary,
    borderRadius: 16, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  requestInfo: { flex: 1 },
  requestName: { color: colors.text.primary, fontSize: typography.base, fontWeight: '700' },
  requestMeta: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  requestActions: { gap: spacing.xs },
  acceptBtn: { paddingVertical: 6, minHeight: 36, paddingHorizontal: spacing.sm },
  declineBtn: { paddingVertical: 6, minHeight: 36, paddingHorizontal: spacing.sm },
  outgoingSection: { marginTop: spacing.lg },
  outgoingHeader: { paddingVertical: spacing.sm },
  outgoingTitle: { color: colors.text.secondary, fontSize: typography.sm, fontWeight: '700' },
  outgoingRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  outgoingName: { flex: 1, color: colors.text.primary, fontSize: typography.sm },
  pendingBadge: {
    backgroundColor: colors.warning + '22', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: colors.warning + '44',
  },
  pendingBadgeText: { color: colors.warning, fontSize: typography.xs, fontWeight: '600' },
  connectionCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.bg.secondary,
    borderRadius: 16, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  connectionInfo: { flex: 1 },
  connectionName: { color: colors.text.primary, fontSize: typography.base, fontWeight: '700' },
  connectionMeta: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  chatBtn: {
    backgroundColor: colors.brand.primary + '22',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: colors.brand.primary + '66',
  },
  chatBtnText: { color: colors.brand.primary, fontSize: typography.sm, fontWeight: '700' },
});
