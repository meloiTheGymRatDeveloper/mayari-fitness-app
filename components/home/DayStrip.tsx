import { ScrollView, TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../../constants/theme';

const DAY_ABBRS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

function getWeekDays(selectedDate: string): Array<{ dateStr: string; abbr: string; num: number }> {
  const selected = new Date(selectedDate + 'T12:00:00Z');
  const dayOfWeek = selected.getUTCDay(); // 0=Sun
  const mondayOffset = (dayOfWeek + 6) % 7;
  const monday = new Date(selected);
  monday.setUTCDate(selected.getUTCDate() - mondayOffset);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    return {
      dateStr: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`,
      abbr: DAY_ABBRS[i],
      num: d.getUTCDate(),
    };
  });
}

interface DayStripProps {
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (date: string) => void;
}

export default function DayStrip({ selectedDate, onSelectDate }: DayStripProps) {
  const days = getWeekDays(selectedDate);
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {days.map(({ dateStr, abbr, num }) => {
        const isSelected = dateStr === selectedDate;
        return (
          <TouchableOpacity
            key={dateStr}
            style={[styles.pill, isSelected && styles.pillActive]}
            onPress={() => onSelectDate(dateStr)}
          >
            <Text style={[styles.abbr, isSelected && styles.textActive]}>{abbr}</Text>
            <Text style={[styles.num, isSelected && styles.textActive]}>{num}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.lg, gap: spacing.xs, paddingVertical: spacing.xs },
  pill: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, minWidth: 42,
    backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center',
  },
  pillActive: { backgroundColor: colors.brand.gold, borderColor: colors.brand.gold },
  abbr: { color: colors.text.muted, fontSize: typography.xs - 1 },
  num: { color: colors.text.muted, fontSize: typography.sm, fontWeight: '600' },
  textActive: { color: colors.bg.primary },
});
