import { useCallback, useEffect, useState } from 'react';
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
import { BorderRadius, Colors, Spacing, Typography } from '../../../constants/theme';
import {
  AdminStudentListItem,
  getAdminStudents,
  getReadableErrorMessage,
} from '../../../services/backend';
import { supabase } from '../../../services/supabase';

type State = 'loading' | 'success' | 'error';

function formatLastAttendance(raw: string | null) {
  if (!raw) return '-';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString();
}

function statusTone(status: AdminStudentListItem['status']) {
  if (status === 'active') return { bg: 'rgba(76,175,80,0.15)', text: Colors.primary };
  if (status === 'paused') return { bg: 'rgba(245,179,68,0.2)', text: '#9B5E00' };
  return { bg: 'rgba(211,47,47,0.16)', text: Colors.error };
}

export default function StudentsScreen() {
  const router = useRouter();
  const [state, setState] = useState<State>('loading');
  const [message, setMessage] = useState('Loading students...');
  const [refreshing, setRefreshing] = useState(false);
  const [rows, setRows] = useState<AdminStudentListItem[]>([]);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setState('loading');

    try {
      const { data: authData, error } = await supabase.auth.getSession();
      if (error || !authData.session?.access_token) {
        throw new Error('Not authenticated');
      }
      const response = await getAdminStudents(authData.session.access_token);
      setRows(response.data ?? []);
      setState('success');
    } catch (err: unknown) {
      setState('error');
      setMessage(getReadableErrorMessage(err, 'Unable to load students.'));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <View style={styles.topMeta}>
          <Text style={styles.title}>Students</Text>
          {state === 'success' ? (
            <Text style={styles.subtitle}>{rows.length} total</Text>
          ) : null}
        </View>
      </View>

      {state === 'loading' ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} />
          <Text style={styles.stateText}>Loading student list...</Text>
        </View>
      ) : null}

      {state === 'error' ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{message}</Text>
          <Pressable onPress={() => fetchData()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      {state === 'success' ? (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.student_id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchData(true)}
              tintColor={Colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.stateText}>No students found.</Text>
            </View>
          }
          contentContainerStyle={styles.listWrap}
          renderItem={({ item }) => {
            const tone = statusTone(item.status);
            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.full_name}
                  </Text>
                  <View style={[styles.statusPill, { backgroundColor: tone.bg }]}>
                    <Text style={[styles.statusText, { color: tone.text }]}>{item.status}</Text>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <View style={styles.metaChip}>
                    <Text style={styles.metaLabel}>Batch</Text>
                    <Text style={styles.metaValue}>{item.batch ?? '-'}</Text>
                  </View>
                  <View style={styles.metaChip}>
                    <Text style={styles.metaLabel}>Class</Text>
                    <Text style={styles.metaValue}>{item.class_level ?? '-'}</Text>
                  </View>
                </View>

                <Text style={styles.lastLabel}>Last Attendance</Text>
                <Text style={styles.lastValue}>{formatLastAttendance(item.last_attendance_at)}</Text>

                <View style={styles.actionWrap}>
                  <Pressable
                    style={[styles.actionBtn, styles.viewBtn]}
                    onPress={() => router.push(`/(admin)/students/${item.student_id}` as never)}
                  >
                    <Text style={styles.actionText}>View</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionBtn, styles.editBtn]}
                    onPress={() =>
                      router.push(`/(admin)/students/${item.student_id}?mode=edit` as never)
                    }
                  >
                    <Text style={[styles.actionText, styles.editText]}>Edit</Text>
                  </Pressable>
                </View>
              </View>
            );
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  topMeta: {
    gap: 2,
  },
  backBtn: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: Colors.white,
  },
  backText: { fontFamily: Typography.medium, color: Colors.textMuted, fontSize: 13 },
  title: { fontFamily: Typography.heading, color: Colors.text, fontSize: 24 },
  subtitle: {
    fontFamily: Typography.body,
    color: Colors.textMuted,
    fontSize: 12,
  },
  listWrap: { padding: Spacing.lg, paddingTop: Spacing.sm, gap: Spacing.sm },
  card: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  name: {
    flex: 1,
    fontFamily: Typography.heading,
    fontSize: 18,
    color: Colors.text,
  },
  statusPill: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  statusText: { fontFamily: Typography.medium, fontSize: 12, textTransform: 'capitalize' },
  metaRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  metaChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    backgroundColor: '#fcfaf5',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  metaLabel: {
    fontFamily: Typography.medium,
    fontSize: 11,
    color: Colors.textMuted,
  },
  metaValue: {
    marginTop: 2,
    fontFamily: Typography.body,
    fontSize: 13,
    color: Colors.text,
  },
  lastLabel: {
    fontFamily: Typography.medium,
    color: Colors.textMuted,
    fontSize: 11,
  },
  lastValue: {
    fontFamily: Typography.body,
    color: Colors.text,
    fontSize: 13,
  },
  actionWrap: { flexDirection: 'row', gap: 8, marginTop: 2 },
  actionBtn: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d8d6cf',
    paddingVertical: 9,
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  viewBtn: {
    backgroundColor: '#f8f6f2',
  },
  editBtn: { backgroundColor: 'rgba(76,175,80,0.11)', borderColor: 'rgba(76,175,80,0.35)' },
  actionText: { fontFamily: Typography.medium, fontSize: 12, color: Colors.textMuted },
  editText: { color: Colors.primary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.sm, padding: Spacing.lg },
  emptyWrap: { paddingVertical: Spacing.lg, alignItems: 'center' },
  stateText: { fontFamily: Typography.body, color: Colors.textMuted, fontSize: 14 },
  errorText: { fontFamily: Typography.body, color: Colors.error, fontSize: 14, textAlign: 'center' },
  retryBtn: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.primary,
  },
  retryText: { fontFamily: Typography.heading, color: Colors.white, fontSize: 12 },
});
