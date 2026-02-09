import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BorderRadius, Colors, Spacing, Typography } from '../../constants/theme';
import { ParentNotification } from '../../services/backend';

interface NotificationRowProps {
  notification: ParentNotification;
  onPress: () => void;
}

function formatDateTime(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return value;
  }
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function NotificationRow({ notification, onPress }: NotificationRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        !notification.is_read && styles.cardUnread,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{notification.title}</Text>
        {!notification.is_read ? <View style={styles.unreadDot} /> : null}
      </View>
      <Text style={styles.message}>{notification.message}</Text>
      <Text style={styles.meta}>
        Date: {notification.date} • {formatDateTime(notification.created_at)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  cardUnread: {
    borderColor: Colors.primary,
  },
  cardPressed: {
    opacity: 0.92,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
    gap: Spacing.sm,
  },
  title: {
    flex: 1,
    fontFamily: Typography.heading,
    color: Colors.text,
    fontSize: 16,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  message: {
    fontFamily: Typography.body,
    color: Colors.textMuted,
    fontSize: 14,
    marginBottom: Spacing.sm,
    lineHeight: 20,
  },
  meta: {
    fontFamily: Typography.medium,
    color: Colors.textMuted,
    fontSize: 12,
  },
});
