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
import { AttendanceRow } from '../../components/admin/attendance-row';
import { FeedbackPopup, FeedbackType } from '../../components/feedback-popup';
import { SummaryCard } from '../../components/admin/summary-card';
import { BorderRadius, Colors, Spacing, Typography } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import {
  AdminAttendanceResponseData,
  getAdminAttendance,
  getReadableErrorMessage,
  runAbsentNotifications,
} from '../../services/backend';
import { supabase } from '../../services/supabase';

type DashboardState = 'loading' | 'success' | 'empty' | 'error';

function toLocalISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(dateISO: string, days: number) {
  const d = new Date(`${dateISO}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toLocalISODate(d);
}

function formatHeaderDate(dateISO: string) {
  const d = new Date(`${dateISO}T00:00:00`);
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function HeaderSection({ date }: { date: string }) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>Attendance</Text>
      <Text style={styles.subtitle}>Overview for {formatHeaderDate(date)}</Text>
    </View>
  );
}

function DateSelector({
  date,
  onPrevious,
  onNext,
  onToday,
}: {
  date: string;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
}) {
  return (
    <View style={styles.dateCard}>
      <Pressable style={styles.dateNavButton} onPress={onPrevious}>
        <Text style={styles.dateNavLabel}>Prev</Text>
      </Pressable>
      <Text style={styles.dateValue}>{date}</Text>
      <Pressable style={styles.dateNavButton} onPress={onNext}>
        <Text style={styles.dateNavLabel}>Next</Text>
      </Pressable>
      <Pressable style={styles.todayButton} onPress={onToday}>
        <Text style={styles.todayLabel}>Today</Text>
      </Pressable>
    </View>
  );
}

function SummaryCards({ summary }: { summary: AdminAttendanceResponseData['summary'] }) {
  return (
    <View style={styles.summaryRow}>
      <SummaryCard label="Total" value={summary.total} tone="neutral" />
      <SummaryCard label="Present" value={summary.present} tone="present" />
      <SummaryCard label="Absent" value={summary.absent} tone="absent" />
    </View>
  );
}

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const [selectedDate, setSelectedDate] = useState(toLocalISODate(new Date()));
  const [data, setData] = useState<AdminAttendanceResponseData | null>(null);
  const [state, setState] = useState<DashboardState>('loading');
  const [message, setMessage] = useState('Loading attendance...');
  const [refreshing, setRefreshing] = useState(false);
  const [isSendingNotifications, setIsSendingNotifications] = useState(false);
  const [popup, setPopup] = useState<{
    visible: boolean;
    type: FeedbackType;
    title: string;
    message: string;
  }>({
    visible: false,
    type: 'success',
    title: '',
    message: '',
  });

  function showPopup(type: FeedbackType, title: string, msg: string) {
    setPopup({ visible: true, type, title, message: msg });
  }

  const fetchAttendance = useCallback(
    async (date: string, isRefresh = false) => {
      if (!session) {
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setState('loading');
        setMessage('Loading attendance...');
      }

      try {
        const { data: authData, error: authError } = await supabase.auth.getSession();
        if (authError || !authData.session?.access_token) {
          throw new Error('Not authenticated');
        }

        const response = await getAdminAttendance(authData.session.access_token, date);
        const payload = response.data;
        if (!payload) {
          throw new Error('No attendance data received');
        }

        setData(payload);
        if (payload.records.length === 0) {
          setState('empty');
          setMessage('No students found');
        } else {
          setState('success');
        }
      } catch (error: unknown) {
        setState('error');
        setMessage(getReadableErrorMessage(error, 'Unable to load attendance. Pull to retry.'));
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
    fetchAttendance(selectedDate);
  }, [authLoading, fetchAttendance, selectedDate, session]);

  const records = useMemo(() => data?.records ?? [], [data?.records]);

  async function handleSendAbsentNotifications() {
    if (!session) {
      return;
    }

    try {
      setIsSendingNotifications(true);
      const { data: authData, error: authError } = await supabase.auth.getSession();
      if (authError || !authData.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await runAbsentNotifications(authData.session.access_token, selectedDate);
      const payload = response.data;
      const created = payload?.created_notifications ?? 0;
      const eligible = payload?.eligible_parents ?? 0;
      showPopup(
        'success',
        'Notifications Sent',
        `${created} notification(s) created for ${eligible} parent account(s).`
      );
    } catch (error: unknown) {
      showPopup('error', 'Notification Error', getReadableErrorMessage(error, 'Failed to send notifications.'));
    } finally {
      setIsSendingNotifications(false);
    }
  }

  async function handleLogout() {
    try {
      await supabase.auth.signOut();
    } catch (error: unknown) {
      showPopup('error', 'Logout Error', getReadableErrorMessage(error, 'Unable to logout right now.'));
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FeedbackPopup
        visible={popup.visible}
        type={popup.type}
        title={popup.title}
        message={popup.message}
        onClose={() => setPopup((prev) => ({ ...prev, visible: false }))}
      />
      <FlatList
        data={records}
        keyExtractor={(item) => item.student_id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchAttendance(selectedDate, true)}
            tintColor={Colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.topSection}>
            <HeaderSection date={selectedDate} />
            <View style={styles.topActions}>
              <Pressable onPress={handleLogout} style={styles.logoutButton}>
                <Text style={styles.logoutText}>Logout</Text>
              </Pressable>
            </View>
            <DateSelector
              date={selectedDate}
              onPrevious={() => setSelectedDate((d) => addDays(d, -1))}
              onNext={() => setSelectedDate((d) => addDays(d, 1))}
              onToday={() => setSelectedDate(toLocalISODate(new Date()))}
            />
            <Pressable
              style={({ pressed }) => [
                styles.notifyButton,
                pressed && !isSendingNotifications && styles.notifyButtonPressed,
                isSendingNotifications && styles.notifyButtonDisabled,
              ]}
              onPress={handleSendAbsentNotifications}
              disabled={isSendingNotifications}
            >
              <Text style={styles.notifyButtonText}>
                {isSendingNotifications ? 'Sending Alerts...' : 'Send Absent Alerts to Parents'}
              </Text>
            </Pressable>
            {data?.summary ? <SummaryCards summary={data.summary} /> : null}
            <Text style={styles.listTitle}>Attendance List</Text>
          </View>
        }
        renderItem={({ item }) => (
          <AttendanceRow
            record={item}
            onPress={() =>
              router.push({
                pathname: '/(admin)/student/[studentId]',
                params: { studentId: item.student_id, date: selectedDate, name: item.name },
              })
            }
          />
        )}
        ListEmptyComponent={
          <View style={styles.stateContainer}>
            {state === 'loading' ? (
              <>
                <ActivityIndicator color={Colors.primary} />
                <Text style={styles.stateText}>Loading attendance...</Text>
              </>
            ) : null}

            {state === 'empty' ? <Text style={styles.stateText}>No students found</Text> : null}

            {state === 'error' ? (
              <>
                <Text style={styles.stateTextError}>Unable to load attendance.</Text>
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
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    flexGrow: 1,
  },
  topSection: {
    paddingTop: Spacing.xl,
  },
  topActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: Spacing.sm,
  },
  logoutButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Colors.white,
    borderColor: Colors.border,
    borderWidth: 1,
  },
  logoutText: {
    fontFamily: Typography.medium,
    fontSize: 13,
    color: Colors.textMuted,
  },
  header: {
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: Typography.heading,
    fontSize: 28,
    color: Colors.text,
  },
  subtitle: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 4,
  },
  dateCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  dateNavButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.background,
  },
  dateNavLabel: {
    fontFamily: Typography.medium,
    color: Colors.text,
    fontSize: 13,
  },
  dateValue: {
    fontFamily: Typography.heading,
    color: Colors.text,
    fontSize: 16,
    flex: 1,
    textAlign: 'center',
  },
  todayButton: {
    backgroundColor: Colors.primary,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  todayLabel: {
    color: Colors.white,
    fontFamily: Typography.medium,
    fontSize: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  notifyButton: {
    backgroundColor: Colors.primary,
    borderRadius: 26,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  notifyButtonPressed: {
    opacity: 0.9,
  },
  notifyButtonDisabled: {
    opacity: 0.7,
  },
  notifyButtonText: {
    fontFamily: Typography.heading,
    fontSize: 15,
    color: Colors.white,
  },
  listTitle: {
    fontFamily: Typography.heading,
    fontSize: 18,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  stateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
