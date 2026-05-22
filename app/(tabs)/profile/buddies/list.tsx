import { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, typography, spacing } from '../../../../constants/theme';
import Button from '../../../../components/ui/Button';
import Skeleton from '../../../../components/ui/Skeleton';
import EmptyState from '../../../../components/ui/EmptyState';
import { useBuddyRequests, useBuddyConnections, useAcceptRequest, useDeclineRequest } from '../../../../hooks/useBuddies';
import type { RequestWithUser, ConnectionWithUser } from '../../../../hooks/useBuddies';

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
  const [outgoingExpanded, setOutgoingExpanded] = useState(false);

  const { data: requestsData, isLoading: loading } = useBuddyRequests();
  const incoming = requestsData?.incoming ?? [];
  const outgoing = requestsData?.outgoing ?? [];
  const { data: connections = [] } = useBuddyConnections();
  const acceptMutation = useAcceptRequest();
  const declineMutation = useDeclineRequest();

  function acceptRequest(requestId: string, senderId: string) {
    acceptMutation.mutate(
      { requestId, senderId },
      { onError: (e) => Alert.alert('Error', e instanceof Error ? e.message : 'Could not accept request.') }
    );
  }

  function declineRequest(requestId: string) {
    declineMutation.mutate(
      requestId,
      { onError: (e) => Alert.alert('Error', e instanceof Error ? e.message : 'Could not decline request.') }
    );
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
                  disabled={acceptMutation.isPending || declineMutation.isPending}
                />
                <Button
                  label="Decline"
                  variant="outline"
                  onPress={() => declineRequest(item.id)}
                  style={styles.declineBtn}
                  disabled={acceptMutation.isPending || declineMutation.isPending}
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
