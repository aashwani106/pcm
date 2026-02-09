import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { NotificationRow } from '../../components/parent/notification-row';
import { BorderRadius, Colors, Spacing, Typography } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import {
  getParentNotifications,
  getReadableErrorMessage,
  markParentNotificationRead,
  ParentNotification,
} from '../../services/backend';
import { supabase } from '../../services/supabase';

type ParentState = 'loading' | 'success' | 'empty' | 'error';

export default function ParentDashboard() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const [items, setItems] = useState<ParentNotification[]>([]);
  const [state, setState] = useState<ParentState>('loading');
  const [message, setMessage] = useState('Loading notifications...');
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(
    async (isRefresh = false) => {
      if (!session) {
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setState('loading');
        setMessage('Loading notifications...');
      }

      try {
        const { data, error } = await supabase.auth.getSession();
        if (error || !data.session?.access_token) {
          throw new Error('Not authenticated');
        }

        const response = await getParentNotifications(data.session.access_token);
        const rows = response.data ?? [];
        setItems(rows);
        setState(rows.length === 0 ? 'empty' : 'success');
      } catch (error: unknown) {
        setState('error');
        setMessage(getReadableErrorMessage(error, 'Unable to load notifications. Pull to retry.'));
      } finally {
        setRefreshing(false);
      }
    },
    [session]
  );

  useEffect(() => {
    if (authLoading || !session) {
      return;
    }
    fetchNotifications();
  }, [authLoading, fetchNotifications, session]);

  const unreadCount = useMemo(() => items.filter((item) => !item.is_read).length, [items]);

  async function handleOpenNotification(id: string) {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session?.access_token) {
        throw new Error('Not authenticated');
      }
      await markParentNotificationRead(data.session.access_token, id);
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, is_read: true } : item)));
    } catch {
      // Keep interaction silent for MVP; list refresh still works.
    }
  }

  async function handleLogout() {
    try {
      await supabase.auth.signOut();
    } catch {
      // Keep silent for MVP. Route guard will redirect on success.
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchNotifications(true)}
            tintColor={Colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.headerCard}>
            <Text style={styles.title}>Parent Alerts</Text>
            <Text style={styles.subtitle}>Attendance updates from the institute</Text>
            <View style={styles.topActions}>
              <Pressable onPress={() => router.push('/(parent)/calendar')} style={styles.calendarButton}>
                <Text style={styles.calendarText}>Calendar</Text>
              </Pressable>
              <Pressable onPress={handleLogout} style={styles.logoutButton}>
                <Text style={styles.logoutText}>Logout</Text>
              </Pressable>
            </View>
            <View style={styles.unreadPill}>
              <Text style={styles.unreadText}>Unread: {unreadCount}</Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <NotificationRow notification={item} onPress={() => handleOpenNotification(item.id)} />
        )}
        ListEmptyComponent={
          <View style={styles.stateContainer}>
            {state === 'loading' ? (
              <>
                <ActivityIndicator color={Colors.primary} />
                <Text style={styles.stateText}>Loading notifications...</Text>
              </>
            ) : null}
            {state === 'empty' ? <Text style={styles.stateText}>No notifications yet</Text> : null}
            {state === 'error' ? (
              <>
                <Text style={styles.stateTextError}>Unable to load notifications.</Text>
                <Text style={styles.stateSubText}>{message || 'Pull to retry.'}</Text>
              </>
            ) : null}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    flexGrow: 1,
  },
  headerCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: Typography.heading,
    fontSize: 24,
    color: Colors.text,
  },
  subtitle: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 4,
    marginBottom: Spacing.sm,
  },
  topActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  calendarButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Colors.background,
    borderColor: Colors.border,
    borderWidth: 1,
  },
  calendarText: {
    fontFamily: Typography.medium,
    fontSize: 13,
    color: Colors.primary,
  },
  logoutButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Colors.background,
    borderColor: Colors.border,
    borderWidth: 1,
  },
  logoutText: {
    fontFamily: Typography.medium,
    fontSize: 13,
    color: Colors.textMuted,
  },
  unreadPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: 'rgba(76, 175, 80, 0.16)',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  unreadText: {
    fontFamily: Typography.medium,
    color: Colors.primary,
    fontSize: 12,
  },
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
  },
  stateText: {
    marginTop: Spacing.sm,
    fontFamily: Typography.body,
    color: Colors.textMuted,
    fontSize: 15,
    textAlign: 'center',
  },
  stateTextError: {
    marginTop: Spacing.sm,
    fontFamily: Typography.heading,
    color: Colors.error,
    fontSize: 16,
    textAlign: 'center',
  },
  stateSubText: {
    marginTop: 4,
    fontFamily: Typography.medium,
    color: Colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
});
