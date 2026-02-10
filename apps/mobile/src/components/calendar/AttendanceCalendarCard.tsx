import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { BorderRadius, Colors, Spacing, Typography } from '../../../constants/theme';
import { AdminAttendanceCalendarDay } from '../../../services/backend';
import {
  buildMonthGrid,
  formatMarkedTime,
  formatMonthLabel,
  getCellType,
  shiftMonth,
  toLocalISODate,
} from '../../utils/calendar';

type ScreenState = 'loading' | 'success' | 'error';

interface AttendanceCalendarCardProps {
  month: string;
  onMonthChange: (month: string) => void;
  attendanceByDate: Record<string, AdminAttendanceCalendarDay>;
  holidays: string[];
  state: ScreenState;
  message?: string;
  showLegend?: boolean;
  blockedReason?: string | null;
  manualOverride?: {
    loading?: boolean;
    onSubmit: (input: { date: string; status: 'present' | 'absent'; remark: string }) => Promise<void> | void;
  };
  reviewActions?: {
    loading?: boolean;
    canReview?: boolean;
    onReviewSubmit: (input: {
      attendanceId: string;
      status: 'accepted' | 'flagged';
      note?: string;
    }) => Promise<void> | void;
    onLoadPhotoUrl?: (attendanceId: string) => Promise<string | null>;
  };
}

const WEEK_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function AttendanceCalendarCard({
  month,
  onMonthChange,
  attendanceByDate,
  holidays,
  state,
  message = 'Unable to load attendance calendar.',
  showLegend = false,
  blockedReason = null,
  manualOverride,
  reviewActions,
}: AttendanceCalendarCardProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [remark, setRemark] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [photoViewUrl, setPhotoViewUrl] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const holidaysSet = useMemo(() => new Set(holidays), [holidays]);
  const cells = useMemo(() => buildMonthGrid(month), [month]);
  const todayISO = toLocalISODate(new Date());

  const selectedDetail = useMemo(() => {
    if (!selectedDate) return null;
    const dayType = getCellType(selectedDate, holidaysSet, attendanceByDate, todayISO);
    const row = attendanceByDate[selectedDate];
    if (dayType === 'future' || dayType === 'holiday') {
      return {
        date: selectedDate,
        attendance_id: null,
        status: dayType,
        marked_at: '-',
        marked_by: '-',
        remark: '-',
        photo_url: null,
        accuracy_meters: null,
        review_status: null,
        review_note: null,
        reviewed_at: null,
        reviewed_by_role: null,
      };
    }
    return {
      date: selectedDate,
      attendance_id: row?.attendance_id ?? null,
      status: row?.status ?? 'absent',
      marked_at: formatMarkedTime(row?.marked_at ?? null),
      marked_by: row?.marked_by ?? '-',
      remark: row?.remark ?? '-',
      photo_url: row?.photo_url ?? null,
      accuracy_meters: row?.accuracy_meters ?? null,
      review_status: row?.review_status ?? null,
      review_note: row?.review_note ?? null,
      reviewed_at: row?.reviewed_at ?? null,
      reviewed_by_role: row?.reviewed_by_role ?? null,
    };
  }, [attendanceByDate, holidaysSet, selectedDate, todayISO]);

  const canManualOverride = Boolean(
    manualOverride && selectedDetail && selectedDetail.status !== 'future' && selectedDetail.status !== 'holiday'
  );
  const canReview = Boolean(
    reviewActions?.canReview &&
      selectedDetail &&
      selectedDetail.status !== 'future' &&
      selectedDetail.status !== 'holiday' &&
      selectedDetail.attendance_id
  );

  useEffect(() => {
    setRemark('');
    setReviewNote('');
    setPhotoViewUrl(null);

    if (selectedDetail?.attendance_id && selectedDetail?.photo_url) {
      loadPhotoViewUrl(selectedDetail.attendance_id);
    }
  }, [selectedDetail?.attendance_id, selectedDetail?.photo_url]);

  async function loadPhotoViewUrl(attendanceId: string) {
    if (!reviewActions?.onLoadPhotoUrl) {
      setPhotoViewUrl(null);
      return;
    }
    try {
      setPhotoLoading(true);
      const url = await reviewActions.onLoadPhotoUrl(attendanceId);
      setPhotoViewUrl(url);
    } finally {
      setPhotoLoading(false);
    }
  }

  async function handleManualOverride(status: 'present' | 'absent') {
    if (!manualOverride || !selectedDetail) return;
    const trimmedRemark = remark.trim();
    if (!trimmedRemark) return;
    await manualOverride.onSubmit({ date: selectedDetail.date, status, remark: trimmedRemark });
    setSelectedDate(null);
    setRemark('');
  }

  async function handleReview(status: 'accepted' | 'flagged') {
    if (!canReview || !selectedDetail?.attendance_id || !reviewActions) return;
    await reviewActions.onReviewSubmit({
      attendanceId: selectedDetail.attendance_id,
      status,
      note: reviewNote.trim() ? reviewNote.trim() : undefined,
    });
    setSelectedDate(null);
    setReviewNote('');
  }

  return (
    <>
      <Modal
        transparent
        animationType="fade"
        visible={selectedDate != null}
        onRequestClose={() => setSelectedDate(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Attendance Detail</Text>
            <Text style={styles.modalText}>Date: {selectedDetail?.date ?? '-'}</Text>
            <Text style={styles.modalText}>Status: {selectedDetail?.status ?? '-'}</Text>
            <Text style={styles.modalText}>Marked Time: {selectedDetail?.marked_at ?? '-'}</Text>
            <Text style={styles.modalText}>Marked By: {selectedDetail?.marked_by ?? '-'}</Text>
            <Text style={styles.modalText}>Remark: {selectedDetail?.remark ?? '-'}</Text>
            {selectedDetail?.status === 'absent' && blockedReason ? (
              <Text style={styles.modalText}>Reason: {blockedReason}</Text>
            ) : null}
            {selectedDetail?.accuracy_meters != null ? (
              <Text style={styles.modalText}>
                Accuracy: {Math.round(selectedDetail.accuracy_meters)} m
              </Text>
            ) : null}
            <Text style={styles.modalText}>
              Review: {selectedDetail?.review_status ?? 'accepted'}
            </Text>
            <Text style={styles.modalText}>
              Review Note: {selectedDetail?.review_note ?? '-'}
            </Text>
            {photoLoading ? (
              <View style={styles.photoLoadingWrap}>
                <ActivityIndicator color={Colors.primary} />
                <Text style={styles.photoLoadingText}>Loading photo...</Text>
              </View>
            ) : photoViewUrl ? (
              <Image source={{ uri: photoViewUrl }} style={styles.reviewPhoto} resizeMode="cover" />
            ) : selectedDetail?.photo_url ? (
              <Text style={styles.modalMuted}>Photo unavailable</Text>
            ) : (
              <Text style={styles.modalMuted}>No photo for this attendance record</Text>
            )}
            {canReview ? (
              <View style={styles.overrideWrap}>
                <Text style={styles.overrideLabel}>Review attendance</Text>
                <TextInput
                  value={reviewNote}
                  onChangeText={setReviewNote}
                  placeholder="Add optional review note"
                  placeholderTextColor={Colors.textMuted}
                  style={styles.remarkInput}
                  multiline
                />
                <View style={styles.overrideActions}>
                  <Pressable
                    style={[
                      styles.overrideBtn,
                      styles.overridePresentBtn,
                      reviewActions?.loading && styles.overrideBtnDisabled,
                    ]}
                    disabled={Boolean(reviewActions?.loading)}
                    onPress={() => handleReview('accepted')}
                  >
                    <Text style={styles.overrideBtnText}>
                      {reviewActions?.loading ? 'Saving...' : 'Accept'}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.overrideBtn,
                      styles.overrideAbsentBtn,
                      reviewActions?.loading && styles.overrideBtnDisabled,
                    ]}
                    disabled={Boolean(reviewActions?.loading)}
                    onPress={() => handleReview('flagged')}
                  >
                    <Text style={styles.overrideBtnText}>
                      {reviewActions?.loading ? 'Saving...' : 'Flag'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
            {canManualOverride ? (
              <View style={styles.overrideWrap}>
                <Text style={styles.overrideLabel}>Admin Override (reason required)</Text>
                <TextInput
                  value={remark}
                  onChangeText={setRemark}
                  placeholder="Enter reason"
                  placeholderTextColor={Colors.textMuted}
                  style={styles.remarkInput}
                  multiline
                />
                <View style={styles.overrideActions}>
                  <Pressable
                    style={[
                      styles.overrideBtn,
                      styles.overridePresentBtn,
                      (!remark.trim() || manualOverride?.loading) && styles.overrideBtnDisabled,
                    ]}
                    disabled={!remark.trim() || manualOverride?.loading}
                    onPress={() => handleManualOverride('present')}
                  >
                    <Text style={styles.overrideBtnText}>
                      {manualOverride?.loading ? 'Saving...' : 'Mark Present'}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.overrideBtn,
                      styles.overrideAbsentBtn,
                      (!remark.trim() || manualOverride?.loading) && styles.overrideBtnDisabled,
                    ]}
                    disabled={!remark.trim() || manualOverride?.loading}
                    onPress={() => handleManualOverride('absent')}
                  >
                    <Text style={styles.overrideBtnText}>
                      {manualOverride?.loading ? 'Saving...' : 'Mark Absent'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
            <Pressable style={styles.modalClose} onPress={() => setSelectedDate(null)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <View style={styles.monthNav}>
        <Pressable style={styles.navBtn} onPress={() => onMonthChange(shiftMonth(month, -1))}>
          <Text style={styles.navText}>Prev</Text>
        </Pressable>
        <Text style={styles.monthLabel}>{formatMonthLabel(month)}</Text>
        <Pressable style={styles.navBtn} onPress={() => onMonthChange(shiftMonth(month, 1))}>
          <Text style={styles.navText}>Next</Text>
        </Pressable>
      </View>

      {showLegend ? (
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.dayPresent]} />
            <Text style={styles.legendText}>Present</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.dayAbsent]} />
            <Text style={styles.legendText}>Absent</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.dayHoliday]} />
            <Text style={styles.legendText}>Holiday</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.legendFuture]} />
            <Text style={styles.legendText}>Future</Text>
          </View>
        </View>
      ) : null}

      {state === 'loading' ? (
        <View style={styles.stateWrap}>
          <ActivityIndicator color={Colors.primary} />
          <Text style={styles.stateText}>Loading calendar...</Text>
        </View>
      ) : null}

      {state === 'error' ? (
        <View style={styles.stateWrap}>
          <Text style={styles.stateError}>Unable to load attendance calendar.</Text>
          <Text style={styles.stateText}>{message}</Text>
        </View>
      ) : null}

      {state === 'success' ? (
        <View style={styles.calendarCard}>
          <View style={styles.weekHeaderRow}>
            {WEEK_HEADERS.map((w) => (
              <Text key={w} style={styles.weekHeaderText}>
                {w}
              </Text>
            ))}
          </View>
          <View style={styles.grid}>
            {cells.map((cell, idx) => {
              if (!cell.inMonth) {
                return <View key={`e-${idx}`} style={styles.emptyCell} />;
              }
              const dayType = getCellType(cell.dateISO, holidaysSet, attendanceByDate, todayISO);
              return (
                <Pressable key={cell.dateISO} onPress={() => setSelectedDate(cell.dateISO)} style={styles.dayCell}>
                  <View
                    style={[
                      styles.dayInner,
                      dayType === 'present' && styles.dayPresent,
                      dayType === 'absent' && styles.dayAbsent,
                      dayType === 'absent' && blockedReason && styles.dayBlocked,
                      dayType === 'holiday' && styles.dayHoliday,
                      dayType === 'future' && styles.dayFuture,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        dayType === 'future' ? styles.dayTextFuture : styles.dayTextSolid,
                      ]}
                    >
                      {cell.dayNumber}
                    </Text>
                    {attendanceByDate[cell.dateISO]?.marked_by === 'admin' ? (
                      <View style={styles.overrideDot} />
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  monthNav: {
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  navBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  navText: {
    fontFamily: Typography.medium,
    color: Colors.textMuted,
    fontSize: 12,
  },
  monthLabel: {
    fontFamily: Typography.heading,
    color: Colors.text,
    fontSize: 16,
  },
  legendRow: {
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
  },
  legendFuture: {
    backgroundColor: '#F8F6F2',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  legendText: {
    fontFamily: Typography.medium,
    color: Colors.textMuted,
    fontSize: 12,
  },
  calendarCard: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  weekHeaderRow: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  weekHeaderText: {
    flex: 1,
    textAlign: 'center',
    fontFamily: Typography.medium,
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 0.3,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  emptyCell: {
    width: '14.2857%',
    aspectRatio: 1,
  },
  dayCell: {
    width: '14.2857%',
    aspectRatio: 1,
    padding: 3,
  },
  dayInner: {
    flex: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dayPresent: {
    backgroundColor: '#62B66A',
  },
  dayAbsent: {
    backgroundColor: '#D99292',
  },
  dayBlocked: {
    backgroundColor: '#B7B8BC',
  },
  dayHoliday: {
    backgroundColor: '#DFDDD8',
  },
  dayFuture: {
    backgroundColor: '#F8F6F2',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dayText: {
    fontFamily: Typography.medium,
    fontSize: 12,
  },
  dayTextFuture: {
    color: Colors.textMuted,
  },
  dayTextSolid: {
    color: Colors.white,
  },
  overrideDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.white,
    position: 'absolute',
    bottom: 4,
  },
  stateWrap: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  stateText: {
    marginTop: Spacing.sm,
    textAlign: 'center',
    fontFamily: Typography.body,
    color: Colors.textMuted,
    fontSize: 14,
  },
  stateError: {
    fontFamily: Typography.heading,
    color: Colors.error,
    textAlign: 'center',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.24)',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  modalCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
  },
  modalTitle: {
    fontFamily: Typography.heading,
    fontSize: 18,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  modalText: {
    fontFamily: Typography.body,
    color: Colors.textMuted,
    marginBottom: 4,
    fontSize: 14,
  },
  modalMuted: {
    marginTop: 2,
    fontFamily: Typography.body,
    color: Colors.textMuted,
    fontSize: 13,
  },
  photoLoadingWrap: {
    marginTop: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  photoLoadingText: {
    fontFamily: Typography.medium,
    color: Colors.textMuted,
    fontSize: 12,
  },
  reviewPhoto: {
    marginTop: Spacing.sm,
    width: '100%',
    height: 220,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#efebe3',
  },
  overrideWrap: {
    marginTop: Spacing.sm,
  },
  overrideLabel: {
    fontFamily: Typography.medium,
    color: Colors.text,
    fontSize: 13,
    marginBottom: 6,
  },
  remarkInput: {
    minHeight: 58,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    backgroundColor: '#FAFAF8',
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: Colors.text,
    fontFamily: Typography.body,
    fontSize: 13,
  },
  overrideActions: {
    marginTop: Spacing.sm,
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  overrideBtn: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 9,
    alignItems: 'center',
  },
  overridePresentBtn: {
    backgroundColor: Colors.primary,
  },
  overrideAbsentBtn: {
    backgroundColor: Colors.error,
  },
  overrideBtnDisabled: {
    opacity: 0.55,
  },
  overrideBtnText: {
    color: Colors.white,
    fontFamily: Typography.heading,
    fontSize: 12,
  },
  modalClose: {
    marginTop: Spacing.sm,
    borderRadius: 999,
    backgroundColor: Colors.primary,
    alignSelf: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  modalCloseText: {
    color: Colors.white,
    fontFamily: Typography.heading,
    fontSize: 13,
  },
});
