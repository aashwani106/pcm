import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FeedbackPopup, FeedbackType } from '../../../components/feedback-popup';
import { BorderRadius, Colors, Spacing, Typography } from '../../../constants/theme';
import {
  AdminStudentDetail,
  getAdminStudent,
  getReadableErrorMessage,
  updateAdminStudent,
} from '../../../services/backend';
import { supabase } from '../../../services/supabase';

type State = 'loading' | 'ready' | 'error';
type Status = 'active' | 'paused' | 'left';

export default function StudentDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ studentId?: string; mode?: string }>();
  const studentId = typeof params.studentId === 'string' ? params.studentId : '';
  const forceEdit = params.mode === 'edit';

  const [state, setState] = useState<State>('loading');
  const [message, setMessage] = useState('Loading student...');
  const [detail, setDetail] = useState<AdminStudentDetail | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingAttendanceToggle, setSavingAttendanceToggle] = useState(false);
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

  const [fullName, setFullName] = useState('');
  const [classLevel, setClassLevel] = useState('');
  const [batchId, setBatchId] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [remark, setRemark] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentEmail, setParentEmail] = useState('');

  function showPopup(type: FeedbackType, title: string, msg: string) {
    setPopup({ visible: true, type, title, message: msg });
  }

  const hydrate = useCallback((data: AdminStudentDetail) => {
    setDetail(data);
    setFullName(data.full_name ?? '');
    setClassLevel(data.class_level ?? '');
    setBatchId(data.batch_id ?? '');
    setRollNumber(data.roll_number ?? '');
    setRemark(data.remark ?? '');
    setParentName(data.parent_name ?? '');
    setParentPhone(data.parent_phone ?? '');
    setParentEmail(data.parent_email ?? '');
  }, []);

  const load = useCallback(async () => {
    if (!studentId) {
      setState('error');
      setMessage('Student id missing');
      return;
    }

    try {
      setState('loading');
      const { data: authData, error } = await supabase.auth.getSession();
      if (error || !authData.session?.access_token) throw new Error('Not authenticated');
      const response = await getAdminStudent(authData.session.access_token, studentId);
      if (!response.data) throw new Error('No student data');
      hydrate(response.data);
      setState('ready');
    } catch (err: unknown) {
      setState('error');
      setMessage(getReadableErrorMessage(err, 'Unable to load student.'));
    }
  }, [studentId, hydrate]);

  useEffect(() => {
    load();
  }, [load]);

  const status = detail?.status ?? 'active';
  const attendanceEnabled = detail?.attendance_enabled ?? true;
  const dirty = useMemo(() => {
    if (!detail) return false;
    return (
      fullName !== (detail.full_name ?? '') ||
      classLevel !== (detail.class_level ?? '') ||
      batchId !== (detail.batch_id ?? '') ||
      rollNumber !== (detail.roll_number ?? '') ||
      remark !== (detail.remark ?? '') ||
      parentName !== (detail.parent_name ?? '') ||
      parentPhone !== (detail.parent_phone ?? '') ||
      parentEmail !== (detail.parent_email ?? '')
    );
  }, [detail, fullName, classLevel, batchId, rollNumber, remark, parentName, parentPhone, parentEmail]);

  async function patch(input: Parameters<typeof updateAdminStudent>[2], successMsg?: string) {
    if (!studentId) return;
    const { data: authData, error } = await supabase.auth.getSession();
    if (error || !authData.session?.access_token) throw new Error('Not authenticated');
    const response = await updateAdminStudent(authData.session.access_token, studentId, input);
    if (!response.data) throw new Error('No student data');
    hydrate(response.data);
    if (successMsg) showPopup('success', 'Saved', successMsg);
  }

  async function handleStatusChange(next: Status) {
    if (!detail || detail.status === next) return;
    try {
      setSavingStatus(true);
      await patch({ status: next }, `Status changed to ${next}.`);
    } catch (err: unknown) {
      showPopup('error', 'Save Failed', getReadableErrorMessage(err, 'Failed to update status.'));
    } finally {
      setSavingStatus(false);
    }
  }

  async function handleAttendanceToggle(next: boolean) {
    if (!detail || detail.attendance_enabled === next) return;
    try {
      setSavingAttendanceToggle(true);
      await patch(
        { attendance_enabled: next },
        next ? 'Attendance enabled for student.' : 'Attendance disabled for student.'
      );
    } catch (err: unknown) {
      showPopup(
        'error',
        'Save Failed',
        getReadableErrorMessage(err, 'Failed to update attendance control.')
      );
    } finally {
      setSavingAttendanceToggle(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      await patch(
        {
          full_name: fullName.trim(),
          class_level: classLevel.trim() || null,
          batch_id: batchId.trim() || null,
          roll_number: rollNumber.trim() || null,
          remark: remark.trim() || null,
          parent_name: parentName.trim() || null,
          parent_phone: parentPhone.trim() || null,
          parent_email: parentEmail.trim() || null,
        },
        'Student details updated.'
      );
    } catch (err: unknown) {
      showPopup('error', 'Save Failed', getReadableErrorMessage(err, 'Failed to update student.'));
    } finally {
      setSaving(false);
    }
  }

  if (state === 'loading') {
    return (
      <SafeAreaView style={styles.center} edges={['top']}>
        <ActivityIndicator color={Colors.primary} />
        <Text style={styles.stateText}>Loading student details...</Text>
      </SafeAreaView>
    );
  }

  if (state === 'error') {
    return (
      <SafeAreaView style={styles.center} edges={['top']}>
        <Text style={styles.errorText}>{message}</Text>
        <Pressable style={styles.retryButton} onPress={load}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </SafeAreaView>
    );
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
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <Text style={styles.title}>Student Detail</Text>
        </View>

        <Text style={styles.metaLine}>Student ID: {detail?.student_id}</Text>
        <Text style={styles.metaLine}>Email: {detail?.email ?? '-'}</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Status</Text>
          <View style={styles.statusRow}>
            {(['active', 'paused', 'left'] as Status[]).map((item) => (
              <Pressable
                key={item}
                onPress={() => handleStatusChange(item)}
                disabled={savingStatus}
                style={[styles.statusChip, status === item && styles.statusChipActive]}
              >
                <Text style={[styles.statusChipText, status === item && styles.statusChipTextActive]}>
                  {item}
                </Text>
              </Pressable>
            ))}
          </View>
          {savingStatus ? <Text style={styles.hintText}>Saving status...</Text> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Section A · Core Student Info</Text>
          <Text style={styles.label}>Full Name</Text>
          <TextInput value={fullName} onChangeText={setFullName} style={styles.input} placeholder="Full name" />

          <Text style={styles.label}>Class Level</Text>
          <TextInput value={classLevel} onChangeText={setClassLevel} style={styles.input} placeholder="Class level" />

          <Text style={styles.label}>Batch</Text>
          <TextInput value={batchId} onChangeText={setBatchId} style={styles.input} placeholder="Batch id/name" />

          <Text style={styles.label}>Roll Number</Text>
          <TextInput value={rollNumber} onChangeText={setRollNumber} style={styles.input} placeholder="Roll number" />

          <Text style={styles.label}>Remark</Text>
          <TextInput
            value={remark}
            onChangeText={setRemark}
            style={[styles.input, styles.textArea]}
            placeholder="Remark"
            multiline
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Section B · Parent Snapshot</Text>
          <Text style={styles.label}>Parent Name</Text>
          <TextInput
            value={parentName}
            onChangeText={setParentName}
            style={styles.input}
            placeholder="Parent name"
          />

          <Text style={styles.label}>Parent Phone</Text>
          <TextInput
            value={parentPhone}
            onChangeText={setParentPhone}
            style={styles.input}
            placeholder="Parent phone"
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Parent Email</Text>
          <TextInput
            value={parentEmail}
            onChangeText={setParentEmail}
            style={styles.input}
            placeholder="Parent email"
            autoCapitalize="none"
          />

          <Pressable
            style={[styles.saveBtn, (!dirty || saving) && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!dirty || saving}
          >
            <Text style={styles.saveText}>{saving ? 'Saving...' : forceEdit ? 'Save Changes' : 'Save'}</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Section C · Attendance Controls</Text>
          <Text style={styles.hintText}>
            Disable attendance without removing student
          </Text>
          <View style={styles.statusRow}>
            <Pressable
              style={[styles.statusChip, attendanceEnabled && styles.statusChipActive]}
              onPress={() => handleAttendanceToggle(true)}
              disabled={savingAttendanceToggle}
            >
              <Text style={[styles.statusChipText, attendanceEnabled && styles.statusChipTextActive]}>
                Enabled
              </Text>
            </Pressable>
            <Pressable
              style={[styles.statusChip, !attendanceEnabled && styles.statusChipActiveDanger]}
              onPress={() => handleAttendanceToggle(false)}
              disabled={savingAttendanceToggle}
            >
              <Text style={[styles.statusChipText, !attendanceEnabled && styles.statusChipTextDanger]}>
                Disabled
              </Text>
            </Pressable>
          </View>
          {savingAttendanceToggle ? <Text style={styles.hintText}>Saving attendance control...</Text> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Section D · System Fields (Read-only)</Text>
          <Text style={styles.metaLine}>Admission Date: {detail?.admission_date ?? '-'}</Text>
          <Text style={styles.metaLine}>Created At: {detail?.created_at ?? '-'}</Text>
          <Text style={styles.metaLine}>Last Attendance: {detail?.last_attendance_at ?? '-'}</Text>
          <Text style={styles.metaLine}>Student ID: {detail?.student_id ?? '-'}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.xl },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
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
  metaLine: { fontFamily: Typography.body, fontSize: 12, color: Colors.textMuted, marginBottom: 2 },
  card: {
    marginTop: Spacing.md,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  sectionTitle: {
    fontFamily: Typography.heading,
    color: Colors.text,
    fontSize: 14,
    marginBottom: 4,
  },
  label: { fontFamily: Typography.medium, color: Colors.text, fontSize: 13, marginBottom: 6, marginTop: 6 },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontFamily: Typography.body,
    fontSize: 14,
    color: Colors.text,
    backgroundColor: '#fbfbfa',
  },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  statusRow: { flexDirection: 'row', gap: Spacing.xs, marginTop: 4 },
  statusChip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: Colors.white,
  },
  statusChipActive: { backgroundColor: 'rgba(76,175,80,0.14)', borderColor: 'rgba(76,175,80,0.4)' },
  statusChipActiveDanger: { backgroundColor: 'rgba(211,47,47,0.14)', borderColor: 'rgba(211,47,47,0.35)' },
  statusChipText: { fontFamily: Typography.medium, color: Colors.textMuted, fontSize: 12, textTransform: 'capitalize' },
  statusChipTextActive: { color: Colors.primary },
  statusChipTextDanger: { color: Colors.error },
  hintText: { marginTop: 6, fontFamily: Typography.body, color: Colors.textMuted, fontSize: 12 },
  saveBtn: {
    marginTop: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: 999,
    alignItems: 'center',
    paddingVertical: 11,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveText: { fontFamily: Typography.heading, color: Colors.white, fontSize: 14 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.sm, padding: Spacing.lg },
  stateText: { fontFamily: Typography.body, color: Colors.textMuted, fontSize: 14 },
  errorText: { fontFamily: Typography.body, color: Colors.error, fontSize: 14, textAlign: 'center' },
  retryButton: { borderRadius: 999, backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 8 },
  retryText: { fontFamily: Typography.heading, color: Colors.white, fontSize: 12 },
});
