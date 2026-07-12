// components/coach/ChatBubble.tsx
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing, fonts } from '../../constants/theme';
import type { CoachMessage } from '../../types/database';

export default function ChatBubble({ message }: { message: CoachMessage }) {
  const isUser = message.role === 'user';
  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowCoach]}>
      {!isUser && <Text style={styles.coachIcon}>🌙</Text>}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleCoach]}>
        <Text style={styles.text}>{message.content}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginBottom: spacing.sm, alignItems: 'flex-end', gap: 6 },
  rowUser: { justifyContent: 'flex-end' },
  rowCoach: { justifyContent: 'flex-start' },
  coachIcon: { fontSize: 18, marginBottom: 4 },
  bubble: { maxWidth: '80%', borderRadius: 16, paddingVertical: 10, paddingHorizontal: 14 },
  bubbleUser: { backgroundColor: colors.brand.primary, borderBottomRightRadius: 4 },
  bubbleCoach: { backgroundColor: colors.bg.elevated, borderBottomLeftRadius: 4 },
  text: { color: colors.text.primary, fontSize: typography.sm, fontFamily: fonts.regular, lineHeight: 20 },
});
