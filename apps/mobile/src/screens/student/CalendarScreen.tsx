import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AttendanceCalendarCard } from '../../components/calendar/AttendanceCalendarCard';
import { BorderRadius, Colors, Spacing, Typography } from '../../../constants/theme';
import {
  AdminStudentAttendanceCalendarData,
  getReadableErrorMessage,
  getStudentAttendanceCalendar,
} from '../../../services/backend';
import { supabase } from '../../../services/supabase';
import { toYearMonth } from '../../utils/calendar';

type ScreenState = 'loading' | 'success' | 'error';

export default function StudentCalendarScreen() {
  const router = useRouter();
  const [month, setMonth] = useState(toYearMonth(new Date()));
  const [data, setData] = useState<AdminStudentAttendanceCalendarData | null>(null);
  const [state, setState] = useState<ScreenState>('loading');
  const [message, setMessage] = useState('Loading calendar...');
  const [refreshing, setRefreshing] = useState(false);

  const fetchCalendar = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setState('loading');

      try {
        const { data: sessionData, error } = await supabase.auth.getSession();
        if (error || !sessionData.session?.access_token) throw new Error('Not authenticated');
        const response = await getStudentAttendanceCalendar(sessionData.session.access_token, month);
        if (!response.data) throw new Error('No calendar data');
        setData(response.data);
        setState('success');
      } catch (err: unknown) {
        setState('error');
        setMessage(getReadableErrorMessage(err, 'Unable to load attendance calendar.'));
      } finally {
        setRefreshing(false);
      }
    },
    [month]
  );

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchCalendar(true)} tintColor={Colors.primary} />}
      >
        <View style={styles.topActions}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>Back</Text>
          </Pressable>
        </View>

        <Text style={styles.name}>My Attendance Calendar</Text>

        <AttendanceCalendarCard
          month={month}
          onMonthChange={setMonth}
          attendanceByDate={data?.attendance_by_date ?? {}}
          holidays={data?.holidays ?? []}
          state={state}
          message={message}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.xl },
  topActions: { flexDirection: 'row', justifyContent: 'flex-start', marginBottom: Spacing.sm },
  backButton: { borderRadius: 999, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white, paddingHorizontal: 14, paddingVertical: 8 },
  backText: { fontFamily: Typography.medium, fontSize: 13, color: Colors.textMuted },
  name: { fontFamily: Typography.heading, fontSize: 24, color: Colors.text },
});
