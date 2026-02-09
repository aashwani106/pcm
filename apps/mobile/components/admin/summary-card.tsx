import { StyleSheet, Text, View } from 'react-native';
import { BorderRadius, Colors, Spacing, Typography } from '../../constants/theme';

interface SummaryCardProps {
  label: string;
  value: number;
  tone?: 'neutral' | 'present' | 'absent';
}

function getToneColor(tone: SummaryCardProps['tone']) {
  if (tone === 'present') {
    return Colors.primary;
  }
  if (tone === 'absent') {
    return Colors.error;
  }
  return Colors.text;
}

export function SummaryCard({ label, value, tone = 'neutral' }: SummaryCardProps) {
  return (
    <View style={styles.card}>
      <Text style={[styles.value, { color: getToneColor(tone) }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  value: {
    fontFamily: Typography.heading,
    fontSize: 24,
    marginBottom: 2,
  },
  label: {
    fontFamily: Typography.medium,
    fontSize: 13,
    color: Colors.textMuted,
  },
});
