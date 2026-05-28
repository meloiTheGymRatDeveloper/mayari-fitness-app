import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../../../../lib/supabase';
import { colors, typography, spacing, fonts } from '../../../../../constants/theme';
import type { BuddyMessage } from '../../../../../types/database';

interface BuddyInfo {
  id: string;
  display_name: string;
}

export default function BuddyChatScreen() {
  const { id: rawConnectionId } = useLocalSearchParams<{ id: string }>();
  const connectionId = Array.isArray(rawConnectionId) ? rawConnectionId[0] : rawConnectionId;
  const router = useRouter();
  const [myId, setMyId] = useState<string | null>(null);
  const [buddy, setBuddy] = useState<BuddyInfo | null>(null);
  const [messages, setMessages] = useState<BuddyMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    let mounted = true;
    let cleanup: (() => void) | undefined;

    const run = async () => {
      const fn = await initChat(() => mounted);
      if (mounted) cleanup = fn;
    };
    run();

    return () => {
      mounted = false;
      cleanup?.();
    };
  }, [connectionId]);

  async function initChat(isMounted: () => boolean): Promise<(() => void) | undefined> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !isMounted()) return;
    setMyId(user.id);

    const { data: conn, error: connError } = await supabase
      .from('buddy_connections')
      .select('user_a_id, user_b_id')
      .eq('id', connectionId)
      .single();

    if (connError || !conn || !isMounted()) return;
    const buddyId = conn.user_a_id === user.id ? conn.user_b_id : conn.user_a_id;

    const { data: buddyData } = await supabase
      .from('users')
      .select('id, display_name')
      .eq('id', buddyId)
      .single();

    if (!isMounted()) return;
    setBuddy(buddyData ?? { id: buddyId, display_name: 'Unknown' });
    await loadMessages(user.id, buddyId);
    await markRead(user.id, buddyId);

    if (!isMounted()) return;

    const channel = supabase
      .channel(`buddy-chat-${connectionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'buddy_messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        payload => {
          if (!isMounted()) return;
          setMessages(prev => [...prev, payload.new as BuddyMessage]);
          setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
          markRead(user.id, buddyId);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }

  async function loadMessages(userId: string, buddyId: string) {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('buddy_messages')
        .select('*')
        .or(
          `and(sender_id.eq.${userId},receiver_id.eq.${buddyId}),and(sender_id.eq.${buddyId},receiver_id.eq.${userId})`
        )
        .order('created_at', { ascending: true });
      if (error) throw error;
      setMessages(data ?? []);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 50);
    } catch {
      // silently fail — messages may just be empty
    } finally {
      setLoading(false);
    }
  }

  async function markRead(userId: string, buddyId: string) {
    await supabase
      .from('buddy_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('receiver_id', userId)
      .eq('sender_id', buddyId)
      .is('read_at', null);
  }

  useFocusEffect(
    useCallback(() => {
      if (myId && buddy) markRead(myId, buddy.id);
    }, [myId, buddy])
  );

  async function sendMessage() {
    if (!text.trim() || !myId || !buddy || sending) return;
    const content = text.trim();
    setText('');
    setSending(true);

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: BuddyMessage = {
      id: tempId,
      sender_id: myId,
      receiver_id: buddy.id,
      content,
      read_at: null,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const { data, error } = await supabase
        .from('buddy_messages')
        .insert({ sender_id: myId, receiver_id: buddy.id, content })
        .select()
        .single();
      if (error) throw error;
      // Replace temp message with real one from DB
      setMessages(prev => prev.map(m => m.id === tempId ? (data as BuddyMessage) : m));
    } catch {
      // Remove the optimistic message on failure
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setText(content);
    } finally {
      setSending(false);
    }
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('en-PH', {
      hour: 'numeric', minute: '2-digit', hour12: true,
    });
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerName}>{buddy?.display_name ?? 'Loading...'}</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.brand.primary} style={styles.loader} />
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={m => m.id}
          contentContainerStyle={styles.messageList}
          onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => {
            const isMe = item.sender_id === myId;
            return (
              <View style={[styles.messageRow, isMe && styles.messageRowMe]}>
                <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                  <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>
                    {item.content}
                  </Text>
                  <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>
                    {formatTime(item.created_at)}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Input bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Type a message..."
          placeholderTextColor={colors.text.muted}
          multiline
          returnKeyType="send"
          onSubmitEditing={sendMessage}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!text.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.sendBtnText}>Send</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingTop: 52, paddingBottom: spacing.md,
    backgroundColor: colors.bg.secondary,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { padding: spacing.sm, marginRight: spacing.sm },
  backText: { color: colors.brand.primary, fontSize: typography['2xl'], fontFamily: fonts.bold },
  headerName: { flex: 1, color: colors.text.primary, fontSize: typography.lg, fontFamily: fonts.bold },
  loader: { flex: 1 },
  messageList: { padding: spacing.md, gap: spacing.sm },
  messageRow: { flexDirection: 'row', justifyContent: 'flex-start' },
  messageRowMe: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '75%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: colors.bg.secondary, borderTopLeftRadius: 4,
  },
  bubbleMe: { backgroundColor: colors.brand.primary, borderTopLeftRadius: 18, borderTopRightRadius: 4 },
  bubbleThem: { borderTopLeftRadius: 4 },
  bubbleText: { color: colors.text.primary, fontSize: typography.base, lineHeight: 20 },
  bubbleTextMe: { color: '#fff' },
  bubbleTime: { color: colors.text.muted, fontSize: typography.xs, marginTop: 4, alignSelf: 'flex-end' },
  bubbleTimeMe: { color: 'rgba(255,255,255,0.7)' },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, padding: spacing.md,
    backgroundColor: colors.bg.secondary,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  input: {
    flex: 1, color: colors.text.primary, fontSize: typography.base,
    backgroundColor: colors.bg.elevated,
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10,
    maxHeight: 100, minHeight: 44,
  },
  sendBtn: {
    backgroundColor: colors.brand.primary,
    borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10,
    minHeight: 44, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: '#fff', fontFamily: fonts.bold, fontSize: typography.base },
});
