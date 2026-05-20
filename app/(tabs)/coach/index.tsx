// app/(tabs)/coach/index.tsx
import { useState, useRef, useEffect } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, type Href } from 'expo-router';
import { colors, typography, spacing } from '../../../constants/theme';
import {
  useCoachMessages, useTodayMessageCount, useSendMessage,
} from '../../../hooks/useCoach';
import type { CoachMessage } from '../../../types/database';

const GREETING: CoachMessage = {
  id: '__greeting__',
  user_id: '',
  role: 'assistant',
  content: "Kumusta! I'm Coach Mayari 🌙 I'm your personal fitness and nutrition coach. Ask me anything — workout plans, what to eat, why you're not seeing results. Let's go! 💪",
  message_type: 'chat',
  created_at: new Date(0).toISOString(),
};

const QUICK_CHIPS = [
  { label: 'Build my workout plan', navigate: true },
  { label: 'Check my diet', navigate: false },
  { label: "Why am I not losing weight?", navigate: false },
] as const;

function MessageBubble({ msg }: { msg: CoachMessage }) {
  const isUser = msg.role === 'user';
  return (
    <View style={[styles.bubbleRow, isUser ? styles.rowUser : styles.rowCoach]}>
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleCoach]}>
        <Text style={[styles.bubbleText, isUser ? styles.textUser : styles.textCoach]}>
          {msg.content}
        </Text>
      </View>
    </View>
  );
}

function TypingIndicator() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animDot = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(600),
        ])
      );
    const a1 = animDot(dot1, 0);
    const a2 = animDot(dot2, 200);
    const a3 = animDot(dot3, 400);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, []);

  const dotStyle = (anim: Animated.Value) => ({
    opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }],
  });

  return (
    <View style={[styles.bubbleRow, styles.rowCoach]}>
      <View style={[styles.bubble, styles.bubbleCoach, { flexDirection: 'row', gap: 4 }]}>
        <Animated.Text style={[styles.textCoach, dotStyle(dot1)]}>●</Animated.Text>
        <Animated.Text style={[styles.textCoach, dotStyle(dot2)]}>●</Animated.Text>
        <Animated.Text style={[styles.textCoach, dotStyle(dot3)]}>●</Animated.Text>
      </View>
    </View>
  );
}

export default function CoachScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [input, setInput] = useState('');
  const flatRef = useRef<FlatList<CoachMessage>>(null);
  const { data: messages = [], isLoading } = useCoachMessages();
  const { data: todayCount = 0 } = useTodayMessageCount();
  const sendMessage = useSendMessage('chat');

  const hasMessages = messages.length > 0;
  const atLimit = todayCount >= 50;
  const showWarning = todayCount >= 45 && todayCount < 50;

  const listData: CoachMessage[] = hasMessages ? messages : [GREETING];

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sendMessage.isPending || atLimit) return;
    setInput('');
    await sendMessage.mutateAsync(text);
  };

  const handleChip = (chip: (typeof QUICK_CHIPS)[number]) => {
    if (chip.navigate) {
      router.push('/(tabs)/coach/generate' as Href);
    } else {
      sendMessage.mutateAsync(chip.label).catch(() => {
        // mutation errors are surfaced via sendMessage.isError if needed
      });
    }
  };

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }, [messages.length, sendMessage.isPending]);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.headerTitle}>🌙 Coach Mayari</Text>
        <Text style={styles.headerSub}>Science-based · Always here</Text>
      </View>

      {showWarning && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            You've sent {todayCount} messages today. Limit is 50.
          </Text>
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator style={{ flex: 1 }} color={colors.brand.primary} />
      ) : (
        <FlatList
          ref={flatRef}
          data={sendMessage.isPending ? [...listData, { ...GREETING, id: '__typing__' }] : listData}
          keyExtractor={item => item.id}
          renderItem={({ item }) =>
            item.id === '__typing__' ? <TypingIndicator /> : <MessageBubble msg={item} />
          }
          contentContainerStyle={styles.listContent}
          ListFooterComponent={
            !hasMessages ? (
              <View style={styles.chipsRow}>
                {QUICK_CHIPS.map(chip => (
                  <TouchableOpacity
                    key={chip.label}
                    style={styles.chip}
                    onPress={() => handleChip(chip)}
                    disabled={sendMessage.isPending}
                  >
                    <Text style={styles.chipText}>{chip.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null
          }
        />
      )}

      {/* Navigation chips */}
      <View style={styles.navChipsRow}>
        <TouchableOpacity
          style={styles.navChip}
          onPress={() => router.push('/(tabs)/nutrition/mealbuilder' as Href)}
        >
          <Text style={styles.navChipText}>🍳 Build me a meal</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navChip}
          onPress={() => router.push('/(tabs)/nutrition/mealplan' as Href)}
        >
          <Text style={styles.navChipText}>📅 Plan my week</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder={atLimit ? 'Daily limit reached (50/50)' : 'Ask Coach Mayari...'}
          placeholderTextColor={colors.text.muted}
          multiline
          editable={!atLimit}
          returnKeyType="send"
          blurOnSubmit
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (sendMessage.isPending || atLimit || !input.trim()) && styles.sendBtnOff]}
          onPress={handleSend}
          disabled={sendMessage.isPending || atLimit || !input.trim()}
        >
          <Text style={styles.sendBtnText}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.primary },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { color: colors.brand.secondary, fontSize: typography.xl, fontWeight: '700' },
  headerSub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  warningBanner: {
    backgroundColor: '#78350F',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  warningText: { color: '#FEF3C7', fontSize: typography.xs },
  listContent: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  bubbleRow: { marginVertical: 4 },
  rowUser: { alignItems: 'flex-end' },
  rowCoach: { alignItems: 'flex-start' },
  bubble: {
    maxWidth: '80%',
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  bubbleUser: { backgroundColor: '#4F46E5' },
  bubbleCoach: { backgroundColor: colors.bg.elevated },
  bubbleText: { fontSize: typography.sm, lineHeight: 20 },
  textUser: { color: '#fff' },
  textCoach: { color: colors.text.primary },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.brand.primary,
  },
  chipText: { color: colors.brand.primary, fontSize: typography.xs, fontWeight: '600' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: colors.bg.secondary,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text.primary,
    fontSize: typography.sm,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnOff: { opacity: 0.35 },
  sendBtnText: { color: '#fff', fontSize: typography.xl, fontWeight: '700' },
  navChipsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexWrap: 'wrap',
  },
  navChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.brand.secondary,
  },
  navChipText: { color: colors.brand.secondary, fontSize: typography.xs, fontWeight: '600' },
});
