import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BorderRadius, Colors, Spacing, Typography } from '../../constants/theme';
import {
  AdminAttendanceCalendarDay,
  getParentAttendanceCalendar,
  getReadableErrorMessage,
  ParentCalendarData,
} from '../../services/backend';
import { supabase } from '../../services/supabase';

type ScreenState = 'loading' | 'success' | 'error';
type CalendarDayType = 'present' | 'absent' | 'holiday' | 'future';
interface CalendarCell { dateISO: string; dayNumber: number; inMonth: boolean }
const WEEK_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toLocalISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
function toYearMonth(date: Date) { return toLocalISODate(date).slice(0, 7); }
function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split('-').map(Number);
  return toYearMonth(new Date(y, m - 1 + delta, 1));
}
function formatMonthLabel(month: string) {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}
function buildMonthGrid(month: string): CalendarCell[] {
  const [y, m] = month.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const last = new Date(y, m, 0);
  const cells: CalendarCell[] = [];
  for (let i = 0; i < first.getDay(); i += 1) cells.push({ dateISO: '', dayNumber: 0, inMonth: false });
  for (let d = 1; d <= last.getDate(); d += 1) cells.push({ dateISO: toLocalISODate(new Date(y, m - 1, d)), dayNumber: d, inMonth: true });
  while (cells.length % 7 !== 0) cells.push({ dateISO: '', dayNumber: 0, inMonth: false });
  return cells;
}
function getCellType(dateISO: string, holidaysSet: Set<string>, attendance: Record<string, AdminAttendanceCalendarDay>, todayISO: string): CalendarDayType {
  if (dateISO > todayISO) return 'future';
  if (holidaysSet.has(dateISO)) return 'holiday';
  if (attendance[dateISO]?.status === 'present') return 'present';
  return 'absent';
}
function formatMarkedTime(iso: string | null) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export default function ParentCalendarScreen() {
  const router = useRouter();
  const [month, setMonth] = useState(toYearMonth(new Date()));
  const [selectedStudentId, setSelectedStudentId] = useState<string | undefined>(undefined);
  const [data, setData] = useState<ParentCalendarData | null>(null);
  const [state, setState] = useState<ScreenState>('loading');
  const [message, setMessage] = useState('Loading calendar...');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const fetchCalendar = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setState('loading');
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

  useEffect(() => { fetchCalendar(); }, [fetchCalendar]);

  const calendar = data?.calendar;
  const attendanceByDate = calendar?.attendance_by_date ?? {};
  const holidaysSet = useMemo(() => new Set(calendar?.holidays ?? []), [calendar?.holidays]);
  const cells = useMemo(() => buildMonthGrid(month), [month]);
  const todayISO = toLocalISODate(new Date());

  const selectedDetail = useMemo(() => {
    if (!selectedDate) return null;
    const dayType = getCellType(selectedDate, holidaysSet, attendanceByDate, todayISO);
    const row = attendanceByDate[selectedDate];
    if (dayType === 'future' || dayType === 'holiday') return { date: selectedDate, status: dayType, marked_at: '-', marked_by: '-', remark: '-' };
    return {
      date: selectedDate,
      status: row?.status ?? 'absent',
      marked_at: formatMarkedTime(row?.marked_at ?? null),
      marked_by: row?.marked_by ?? '-',
      remark: row?.remark ?? '-',
    };
  }, [attendanceByDate, holidaysSet, selectedDate, todayISO]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Modal transparent animationType="fade" visible={selectedDate != null} onRequestClose={() => setSelectedDate(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Attendance Detail</Text>
            <Text style={styles.modalText}>Date: {selectedDetail?.date ?? '-'}</Text>
            <Text style={styles.modalText}>Status: {selectedDetail?.status ?? '-'}</Text>
            <Text style={styles.modalText}>Marked Time: {selectedDetail?.marked_at ?? '-'}</Text>
            <Text style={styles.modalText}>Marked By: {selectedDetail?.marked_by ?? '-'}</Text>
            <Text style={styles.modalText}>Remark: {selectedDetail?.remark ?? '-'}</Text>
            <Pressable style={styles.modalClose} onPress={() => setSelectedDate(null)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchCalendar(true)} tintColor={Colors.primary} />}>
        <View style={styles.topActions}>
          <Pressable onPress={() => router.back()} style={styles.backButton}><Text style={styles.backText}>Back</Text></Pressable>
        </View>
        <Text style={styles.name}>Child Attendance Calendar</Text>
        <Text style={styles.meta}>{calendar?.student.name ?? '-'}</Text>
        <View style={styles.childrenRow}>
          {(data?.children ?? []).map((child) => (
            <Pressable key={child.id} onPress={() => setSelectedStudentId(child.id)} style={[styles.childChip, selectedStudentId === child.id && styles.childChipActive]}>
              <Text style={[styles.childChipText, selectedStudentId === child.id && styles.childChipTextActive]}>{child.name}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.monthNav}>
          <Pressable style={styles.navBtn} onPress={() => setMonth((m) => shiftMonth(m, -1))}><Text style={styles.navText}>Prev</Text></Pressable>
          <Text style={styles.monthLabel}>{formatMonthLabel(month)}</Text>
          <Pressable style={styles.navBtn} onPress={() => setMonth((m) => shiftMonth(m, 1))}><Text style={styles.navText}>Next</Text></Pressable>
        </View>

        {state === 'loading' ? <View style={styles.stateWrap}><ActivityIndicator color={Colors.primary} /><Text style={styles.stateText}>Loading calendar...</Text></View> : null}
        {state === 'error' ? <View style={styles.stateWrap}><Text style={styles.stateError}>Unable to load attendance calendar.</Text><Text style={styles.stateText}>{message}</Text></View> : null}
        {state === 'success' ? (
          <View style={styles.calendarCard}>
            <View style={styles.weekHeaderRow}>{WEEK_HEADERS.map((w) => <Text key={w} style={styles.weekHeaderText}>{w}</Text>)}</View>
            <View style={styles.grid}>
              {cells.map((cell, idx) => {
                if (!cell.inMonth) return <View key={`e-${idx}`} style={styles.emptyCell} />;
                const dayType = getCellType(cell.dateISO, holidaysSet, attendanceByDate, todayISO);
                return (
                  <Pressable key={cell.dateISO} onPress={() => setSelectedDate(cell.dateISO)} style={[styles.dayCell, dayType === 'present' && styles.dayPresent, dayType === 'absent' && styles.dayAbsent, dayType === 'holiday' && styles.dayHoliday, dayType === 'future' && styles.dayFuture]}>
                    <Text style={[styles.dayText, dayType === 'future' ? styles.dayTextFuture : styles.dayTextSolid]}>{cell.dayNumber}</Text>
                    {attendanceByDate[cell.dateISO]?.marked_by === 'admin' ? <View style={styles.overrideDot} /> : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}
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
  monthNav: { marginTop: Spacing.xs, marginBottom: Spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs },
  navBtn: { borderRadius: 999, borderWidth: 1, borderColor: Colors.border, backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 12, paddingVertical: 7 },
  navText: { fontFamily: Typography.medium, color: Colors.textMuted, fontSize: 12 },
  monthLabel: { fontFamily: Typography.heading, color: Colors.text, fontSize: 16 },
  calendarCard: { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 10, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md },
  weekHeaderRow: { flexDirection: 'row', marginBottom: Spacing.sm },
  weekHeaderText: { flex: 1, textAlign: 'center', fontFamily: Typography.medium, fontSize: 11, color: Colors.textMuted, letterSpacing: 0.3 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  emptyCell: { width: '13.2%', aspectRatio: 1 },
  dayCell: { width: '13.2%', aspectRatio: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  dayPresent: { backgroundColor: '#62B66A' },
  dayAbsent: { backgroundColor: '#D99292' },
  dayHoliday: { backgroundColor: '#DFDDD8' },
  dayFuture: { backgroundColor: '#F8F6F2', borderWidth: 1, borderColor: Colors.border },
  dayText: { fontFamily: Typography.medium, fontSize: 12 },
  dayTextFuture: { color: Colors.textMuted },
  dayTextSolid: { color: Colors.white },
  overrideDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.white, position: 'absolute', bottom: 4 },
  stateWrap: { alignItems: 'center', paddingVertical: Spacing.xl },
  stateText: { marginTop: Spacing.sm, textAlign: 'center', fontFamily: Typography.body, color: Colors.textMuted, fontSize: 14 },
  stateError: { fontFamily: Typography.heading, color: Colors.error, textAlign: 'center', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.24)', justifyContent: 'center', paddingHorizontal: Spacing.lg },
  modalCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg },
  modalTitle: { fontFamily: Typography.heading, fontSize: 18, color: Colors.text, marginBottom: Spacing.sm },
  modalText: { fontFamily: Typography.body, color: Colors.textMuted, marginBottom: 4, fontSize: 14 },
  modalClose: { marginTop: Spacing.sm, borderRadius: 999, backgroundColor: Colors.primary, alignSelf: 'flex-end', paddingHorizontal: 14, paddingVertical: 8 },
  modalCloseText: { color: Colors.white, fontFamily: Typography.heading, fontSize: 13 },
});
