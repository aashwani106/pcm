import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AttendanceCalendarCard } from '../../components/calendar/AttendanceCalendarCard';
import { BorderRadius, Colors, Spacing, Typography } from '../../../constants/theme';
import {
  AdminStudentAttendanceCalendarData,
  getAdminStudentAttendanceCalendar,
  getReadableErrorMessage,
} from '../../../services/backend';
import { supabase } from '../../../services/supabase';
import { toYearMonth } from '../../utils/calendar';

type ScreenState = 'loading' | 'success' | 'error';

export default function AdminStudentCalendarScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ studentId?: string; name?: string }>();
  const studentId = typeof params.studentId === 'string' ? params.studentId : '';

  const [month, setMonth] = useState(toYearMonth(new Date()));
  const [data, setData] = useState<AdminStudentAttendanceCalendarData | null>(null);
  const [state, setState] = useState<ScreenState>('loading');
  const [message, setMessage] = useState('Loading calendar...');
  const [refreshing, setRefreshing] = useState(false);

  const fetchCalendar = useCallback(
    async (isRefresh = false) => {
      if (!studentId) {
        setState('error');
        setMessage('Student id missing');
        return;
      }

      if (isRefresh) setRefreshing(true);
      else setState('loading');

      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !sessionData.session?.access_token) {
          throw new Error('Not authenticated');
        }

        const response = await getAdminStudentAttendanceCalendar(
          sessionData.session.access_token,
          studentId,
          month
        );
        if (!response.data) {
          throw new Error('No calendar data received');
        }
        setData(response.data);
        setState('success');
      } catch (error: unknown) {
        setState('error');
        setMessage(getReadableErrorMessage(error, 'Unable to load attendance calendar.'));
      } finally {
        setRefreshing(false);
      }
    },
    [month, studentId]
  );

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  const studentName = useMemo(() => {
    if (data?.student.name) return data.student.name;
    if (typeof params.name === 'string' && params.name.trim()) return params.name;
    return `Student ${studentId.slice(0, 8)}`;
  }, [data?.student.name, params.name, studentId]);

  const batch = data?.student.batch ?? '-';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchCalendar(true)}
            tintColor={Colors.primary}
          />
        }
      >
        <View style={styles.topActions}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>Back</Text>
          </Pressable>
        </View>

        <Text style={styles.name}>{studentName}</Text>
        <Text style={styles.meta}>Batch: {batch}</Text>

        <AttendanceCalendarCard
          month={month}
          onMonthChange={setMonth}
          attendanceByDate={data?.attendance_by_date ?? {}}
          holidays={data?.holidays ?? []}
          state={state}
          message={message}
          showLegend
        />
      </ScrollView>
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
    paddingBottom: Spacing.xl,
  },
  topActions: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: Spacing.sm,
  },
  backButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  backText: {
    fontFamily: Typography.medium,
    fontSize: 13,
    color: Colors.textMuted,
  },
  name: {
    fontFamily: Typography.heading,
    fontSize: 24,
    color: Colors.text,
  },
  meta: {
    marginTop: 4,
    fontFamily: Typography.medium,
    color: Colors.textMuted,
    fontSize: 13,
  },
});
