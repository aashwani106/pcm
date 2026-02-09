import { StyleSheet, Text, View } from 'react-native';
import { BorderRadius, Colors, Spacing, Typography } from '../../constants/theme';
import { AdminAttendanceRecord } from '../../services/backend';

interface AttendanceRowProps {
  record: AdminAttendanceRecord;
}

export function AttendanceRow({ record }: AttendanceRowProps) {
  const isPresent = record.status === 'present';

  return (
    <View style={styles.row}>
      <View style={styles.main}>
        <Text style={styles.name}>{record.name}</Text>
        <View style={[styles.badge, isPresent ? styles.badgePresent : styles.badgeAbsent]}>
          <Text style={[styles.badgeText, isPresent ? styles.badgeTextPresent : styles.badgeTextAbsent]}>
            {isPresent ? 'Present' : 'Absent'}
          </Text>
        </View>
      </View>

      <View style={styles.meta}>
        <Text style={styles.metaText}>
          {record.marked_at ? `Marked: ${record.marked_at}` : 'Marked: -'}
        </Text>
        <Text style={styles.metaText}>
          {record.accuracy != null ? `Accuracy: ${Math.round(record.accuracy)}m` : 'Accuracy: -'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  main: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
    gap: Spacing.sm,
  },
  name: {
    flex: 1,
    fontFamily: Typography.heading,
    fontSize: 16,
    color: Colors.text,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgePresent: {
    backgroundColor: 'rgba(76, 175, 80, 0.16)',
  },
  badgeAbsent: {
    backgroundColor: 'rgba(211, 47, 47, 0.12)',
  },
  badgeText: {
    fontFamily: Typography.medium,
    fontSize: 12,
  },
  badgeTextPresent: {
    color: Colors.primary,
  },
  badgeTextAbsent: {
    color: Colors.error,
  },
  meta: {
    gap: 2,
  },
  metaText: {
    fontFamily: Typography.medium,
    fontSize: 13,
    color: Colors.textMuted,
  },
});
