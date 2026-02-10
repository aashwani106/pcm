import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AttendanceCalendarCard } from '../../components/calendar/AttendanceCalendarCard';
import { BorderRadius, Colors, Spacing, Typography } from '../../../constants/theme';
import {
  getAttendancePhotoViewUrl,
  getParentAttendanceCalendar,
  getReadableErrorMessage,
  ParentCalendarData,
  reviewAttendance,
} from '../../../services/backend';
import { supabase } from '../../../services/supabase';
import { toYearMonth } from '../../utils/calendar';

type ScreenState = 'loading' | 'success' | 'error';

export default function ParentCalendarScreen() {
  const router = useRouter();
  const [month, setMonth] = useState(toYearMonth(new Date()));
  const [selectedStudentId, setSelectedStudentId] = useState<string | undefined>(undefined);
  const [data, setData] = useState<ParentCalendarData | null>(null);
  const [state, setState] = useState<ScreenState>('loading');
  const [message, setMessage] = useState('Loading calendar...');
  const [refreshing, setRefreshing] = useState(false);
  const [isSavingReview, setIsSavingReview] = useState(false);

  const fetchCalendar = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setState('loading');

    try {
      const { data: sessionData, error } = await supabase.auth.getSession();
      if (error || !sessionData.session?.access_token) throw new Error('Not authenticated');
      const response = await getParentAttendanceCalendar(sessionData.session.access_token, month, selectedStudentId);
      if (!response.data) throw new Error('No calendar data');
      setData(response.data);
      setSelectedStudentId(response.data.selected_student_id);
      setState('success');
    } catch (err: unknown) {
      setState('error');
      setMessage(getReadableErrorMessage(err, 'Unable to load attendance calendar.'));
    } finally {
      setRefreshing(false);
    }
  }, [month, selectedStudentId]);

  async function loadPhotoViewUrl(attendanceId: string) {
    const { data: sessionData, error } = await supabase.auth.getSession();
    if (error || !sessionData.session?.access_token) throw new Error('Not authenticated');
    const response = await getAttendancePhotoViewUrl(sessionData.session.access_token, attendanceId);
    return response.data?.view_url ?? null;
  }

  async function handleReview(input: {
    attendanceId: string;
    status: 'accepted' | 'flagged';
    note?: string;
  }) {
    try {
      setIsSavingReview(true);
      const { data: sessionData, error } = await supabase.auth.getSession();
      if (error || !sessionData.session?.access_token) throw new Error('Not authenticated');
      await reviewAttendance(sessionData.session.access_token, {
        attendance_id: input.attendanceId,
        review_status: input.status,
        review_note: input.note,
      });
      await fetchCalendar(true);
    } catch (err: unknown) {
      setMessage(getReadableErrorMessage(err, 'Failed to save review.'));
    } finally {
      setIsSavingReview(false);
    }
  }

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

        <Text style={styles.name}>Child Attendance Calendar</Text>
        <Text style={styles.meta}>{data?.calendar.student.name ?? '-'}</Text>

        <View style={styles.childrenRow}>
          {(data?.children ?? []).map((child) => (
            <Pressable key={child.id} onPress={() => setSelectedStudentId(child.id)} style={[styles.childChip, selectedStudentId === child.id && styles.childChipActive]}>
              <Text style={[styles.childChipText, selectedStudentId === child.id && styles.childChipTextActive]}>
                {child.name}
              </Text>
            </Pressable>
          ))}
        </View>

        <AttendanceCalendarCard
          month={month}
          onMonthChange={setMonth}
          attendanceByDate={data?.calendar.attendance_by_date ?? {}}
          holidays={data?.calendar.holidays ?? []}
          state={state}
          message={message}
          reviewActions={{
            loading: isSavingReview,
            canReview: true,
            onReviewSubmit: handleReview,
            onLoadPhotoUrl: loadPhotoViewUrl,
          }}
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
  meta: { marginTop: 4, fontFamily: Typography.medium, color: Colors.textMuted, fontSize: 13 },
  childrenRow: { marginTop: Spacing.sm, marginBottom: Spacing.sm, flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' },
  childChip: { borderRadius: 999, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white, paddingHorizontal: 10, paddingVertical: 6 },
  childChipActive: { borderColor: Colors.primary, backgroundColor: 'rgba(76,175,80,0.14)' },
  childChipText: { fontFamily: Typography.medium, color: Colors.textMuted, fontSize: 12 },
  childChipTextActive: { color: Colors.primary },
});
