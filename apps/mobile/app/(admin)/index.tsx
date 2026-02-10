import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
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
  adminCreateManagedUser,
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

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      <View style={styles.sectionBody}>{children}</View>
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
    <View style={styles.dateBar}>
      <Pressable style={styles.datePill} onPress={onPrevious}>
        <Text style={styles.datePillText}>Prev</Text>
      </Pressable>
      <Text style={styles.dateValue}>{date}</Text>
      <Pressable style={styles.datePill} onPress={onNext}>
        <Text style={styles.datePillText}>Next</Text>
      </Pressable>
      <Pressable style={styles.todayPill} onPress={onToday}>
        <Text style={styles.todayPillText}>Today</Text>
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
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [createEmail, setCreateEmail] = useState('');
  const [createRole, setCreateRole] = useState<'student' | 'parent'>('student');
  const [createParentId, setCreateParentId] = useState('');
  const [createBatch, setCreateBatch] = useState('');
  const [lastCreatedParentId, setLastCreatedParentId] = useState('');
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
      if (!session) return;

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
        if (!payload) throw new Error('No attendance data received');

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
    if (authLoading || !session) return;
    fetchAttendance(selectedDate);
  }, [authLoading, fetchAttendance, selectedDate, session]);

  const records = useMemo(() => data?.records ?? [], [data?.records]);

  async function handleSendAbsentNotifications() {
    if (!session) return;

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

  async function handleCreateUser() {
    if (!session) return;
    if (!createEmail.trim()) {
      showPopup('warning', 'Missing Email', 'Please enter email before creating user.');
      return;
    }
    if (createRole === 'student' && !createParentId.trim()) {
      showPopup('warning', 'Missing Parent ID', 'Student creation requires parent auth user id.');
      return;
    }

    try {
      setIsCreatingUser(true);
      const { data: authData, error: authError } = await supabase.auth.getSession();
      if (authError || !authData.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await adminCreateManagedUser(authData.session.access_token, {
        email: createEmail.trim().toLowerCase(),
        role: createRole,
        parent_id: createRole === 'student' ? createParentId.trim() : undefined,
        batch: createRole === 'student' ? createBatch.trim() || undefined : undefined,
      });
      const payload = response.data;
      if (!payload) throw new Error('Failed to create user');

      setCreateEmail('');
      setCreateBatch('');
      setCreateParentId('');
      if (payload.role === 'parent') {
        setLastCreatedParentId(payload.user_id);
      }

      showPopup(
        'success',
        'User Created',
        `Role: ${payload.role}\nEmail: ${payload.email}\nUser ID: ${payload.user_id}\nTemp Password: ${payload.temporary_password}`
      );
    } catch (error: unknown) {
      showPopup('error', 'Create User Failed', getReadableErrorMessage(error, 'Unable to create user.'));
    } finally {
      setIsCreatingUser(false);
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
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.pageTitle}>Admin Dashboard</Text>
                <Text style={styles.pageSubtitle}>{formatHeaderDate(selectedDate)}</Text>
              </View>
              <Pressable onPress={handleLogout} style={styles.logoutButton}>
                <Text style={styles.logoutText}>Logout</Text>
              </Pressable>
            </View>

            <SectionCard title="Attendance Overview" subtitle="Track daily attendance and notify parents">
              <DateSelector
                date={selectedDate}
                onPrevious={() => setSelectedDate((d) => addDays(d, -1))}
                onNext={() => setSelectedDate((d) => addDays(d, 1))}
                onToday={() => setSelectedDate(toLocalISODate(new Date()))}
              />
              {data?.summary ? <SummaryCards summary={data.summary} /> : null}
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
                  {isSendingNotifications ? 'Sending Alerts...' : 'Send Absent Alerts'}
                </Text>
              </Pressable>
            </SectionCard>

            <SectionCard title="User Management" subtitle="Create parent and student accounts">
              <TextInput
                value={createEmail}
                onChangeText={setCreateEmail}
                placeholder="Email"
                placeholderTextColor={Colors.textMuted}
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <View style={styles.roleRow}>
                <Pressable
                  style={[styles.roleButton, createRole === 'student' && styles.roleButtonActive]}
                  onPress={() => setCreateRole('student')}
                >
                  <Text style={[styles.roleButtonText, createRole === 'student' && styles.roleButtonTextActive]}>
                    Student
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.roleButton, createRole === 'parent' && styles.roleButtonActive]}
                  onPress={() => setCreateRole('parent')}
                >
                  <Text style={[styles.roleButtonText, createRole === 'parent' && styles.roleButtonTextActive]}>
                    Parent
                  </Text>
                </Pressable>
              </View>

              {createRole === 'student' ? (
                <>
                  {lastCreatedParentId ? (
                    <View style={styles.lastParentCard}>
                      <Text style={styles.lastParentLabel}>Last Created Parent ID</Text>
                      <Text selectable style={styles.lastParentValue}>{lastCreatedParentId}</Text>
                      <Pressable style={styles.inlineAction} onPress={() => setCreateParentId(lastCreatedParentId)}>
                        <Text style={styles.inlineActionText}>Use Parent ID</Text>
                      </Pressable>
                    </View>
                  ) : null}

                  <TextInput
                    value={createParentId}
                    onChangeText={setCreateParentId}
                    placeholder="Parent auth user id (uuid)"
                    placeholderTextColor={Colors.textMuted}
                    style={styles.input}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TextInput
                    value={createBatch}
                    onChangeText={setCreateBatch}
                    placeholder="Batch (optional)"
                    placeholderTextColor={Colors.textMuted}
                    style={styles.input}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </>
              ) : null}

              <Pressable
                style={[styles.primaryButton, isCreatingUser && styles.primaryButtonDisabled]}
                onPress={handleCreateUser}
                disabled={isCreatingUser}
              >
                <Text style={styles.primaryButtonText}>
                  {isCreatingUser ? 'Creating...' : `Create ${createRole === 'student' ? 'Student' : 'Parent'}`}
                </Text>
              </Pressable>
            </SectionCard>

            <View style={styles.listHeaderRow}>
              <Text style={styles.listTitle}>Attendance List</Text>
              <Text style={styles.listCount}>{records.length}</Text>
            </View>
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
    paddingTop: Spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  pageTitle: {
    fontFamily: Typography.heading,
    fontSize: 30,
    color: Colors.text,
  },
  pageSubtitle: {
    marginTop: 4,
    fontFamily: Typography.body,
    fontSize: 13,
    color: Colors.textMuted,
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
  sectionCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontFamily: Typography.heading,
    color: Colors.text,
    fontSize: 17,
  },
  sectionSubtitle: {
    marginTop: 2,
    fontFamily: Typography.body,
    color: Colors.textMuted,
    fontSize: 12,
  },
  sectionBody: {
    marginTop: Spacing.sm,
  },
  dateBar: {
    backgroundColor: '#F8F7F3',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
    marginBottom: Spacing.sm,
  },
  datePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  datePillText: {
    fontFamily: Typography.medium,
    color: Colors.text,
    fontSize: 12,
  },
  dateValue: {
    fontFamily: Typography.heading,
    color: Colors.text,
    fontSize: 15,
    flex: 1,
    textAlign: 'center',
  },
  todayPill: {
    backgroundColor: Colors.primary,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  todayPillText: {
    color: Colors.white,
    fontFamily: Typography.medium,
    fontSize: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  notifyButton: {
    backgroundColor: Colors.primary,
    borderRadius: 999,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifyButtonPressed: {
    opacity: 0.9,
  },
  notifyButtonDisabled: {
    opacity: 0.7,
  },
  notifyButtonText: {
    fontFamily: Typography.heading,
    fontSize: 14,
    color: Colors.white,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    backgroundColor: '#FAF9F5',
    color: Colors.text,
    fontFamily: Typography.body,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: Spacing.sm,
  },
  roleRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  roleButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 999,
    paddingVertical: 9,
    alignItems: 'center',
    backgroundColor: '#F8F7F3',
  },
  roleButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(76,175,80,0.14)',
  },
  roleButtonText: {
    fontFamily: Typography.medium,
    color: Colors.textMuted,
    fontSize: 13,
  },
  roleButtonTextActive: {
    color: Colors.primary,
  },
  lastParentCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    backgroundColor: '#F8F7F3',
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  lastParentLabel: {
    fontFamily: Typography.medium,
    color: Colors.textMuted,
    fontSize: 12,
    marginBottom: 4,
  },
  lastParentValue: {
    fontFamily: Typography.body,
    color: Colors.text,
    fontSize: 12,
    marginBottom: Spacing.sm,
  },
  inlineAction: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(76,175,80,0.14)',
  },
  inlineActionText: {
    fontFamily: Typography.medium,
    color: Colors.primary,
    fontSize: 12,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 999,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    fontFamily: Typography.heading,
    fontSize: 14,
    color: Colors.white,
  },
  listHeaderRow: {
    marginTop: 2,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listTitle: {
    fontFamily: Typography.heading,
    fontSize: 18,
    color: Colors.text,
  },
  listCount: {
    minWidth: 28,
    textAlign: 'center',
    fontFamily: Typography.heading,
    color: Colors.primary,
    backgroundColor: 'rgba(76,175,80,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.2)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
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
