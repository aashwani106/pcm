import { useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { useAttendanceLocation } from '../../hooks/useAttendanceLocation';
import { useAttendanceChecks } from '../../hooks/useAttendanceChecks';
import { getDistanceAndInside } from '../../utils/distance';
import { supabase } from '../../services/supabase';
import { getAttendancePhotoUploadUrl, getReadableErrorMessage, markAttendance } from '../../services/backend';
import { isWithinTimeWindow, getTimeWindowStatus } from '../../utils/timeWindow';
import { FeedbackPopup, FeedbackType } from '../../components/feedback-popup';
import {
  COACHING_LATITUDE,
  COACHING_LONGITUDE,
  ATTENDANCE_RADIUS_METERS,
} from '../../constants/attendance';

type CaptureFlowState =
  | 'idle'
  | 'capturing_photo'
  | 'uploading_photo'
  | 'marking_attendance'
  | 'success'
  | 'error';

export type AttendanceStatus =
  | 'loading'
  | 'holiday'
  | 'already_marked'
  | 'no_location'
  | 'accuracy_poor'
  | 'outside'
  | 'not_started'
  | 'closed'
  | 'open';

function getStatusDisplay(type: AttendanceStatus): { label: string; subtext: string; color: string } {
  switch (type) {
    case 'holiday':
      return { label: 'Holiday', subtext: 'No attendance today.', color: Colors.textMuted };
    case 'already_marked':
      return { label: 'Already marked', subtext: 'Attendance already recorded for today.', color: Colors.textMuted };
    case 'no_location':
      return { label: 'Location not ready', subtext: 'Permission or GPS not available. Allow location and try Refresh.', color: Colors.textMuted };
    case 'accuracy_poor':
      return { label: 'Waiting for accurate location', subtext: 'Indoors or weak signal. Please move to an open area.', color: Colors.textMuted };
    case 'outside':
      return { label: 'Outside premises', subtext: 'You must be at the coaching centre to mark attendance.', color: Colors.error };
    case 'not_started':
      return { label: 'Not started', subtext: 'Attendance window has not opened yet.', color: Colors.textMuted };
    case 'closed':
      return { label: 'Closed', subtext: 'Attendance window has ended for today.', color: Colors.textMuted };
    case 'open':
      return { label: 'Open', subtext: 'You can mark attendance now.', color: Colors.primary };
    case 'loading':
    default:
      return { label: '—', subtext: 'Checking…', color: Colors.textMuted };
  }
}

function resolveAttendanceStatus(
  checksLoading: boolean,
  isHoliday: boolean,
  alreadyMarked: boolean,
  hasLocation: boolean,
  isAccuracyAcceptable: boolean,
  isInsidePremises: boolean
): AttendanceStatus {
  if (checksLoading) return 'loading';
  if (isHoliday) return 'holiday';
  if (alreadyMarked) return 'already_marked';
  if (!hasLocation) return 'no_location';
  if (!isAccuracyAcceptable) return 'accuracy_poor';
  if (!isWithinTimeWindow()) return getTimeWindowStatus();
  if (!isInsidePremises) return 'outside';
  return 'open';
}

interface FrozenContext {
  timestamp: string;
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
}

const MAX_RETAKES = 2;

export default function StudentAttendanceScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);

  const [flowState, setFlowState] = useState<CaptureFlowState>('idle');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [retakes, setRetakes] = useState(0);
  const [capturedPhotoUri, setCapturedPhotoUri] = useState<string | null>(null);
  const [frozenContext, setFrozenContext] = useState<FrozenContext | null>(null);
  const [localMarked, setLocalMarked] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

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

  const {
    locationPermission,
    currentLatitude,
    currentLongitude,
    locationAccuracy,
    isAccuracyAcceptable,
    locationError,
    isLoading: locationLoading,
    refresh: refreshLocation,
  } = useAttendanceLocation();
  const { isHoliday, alreadyMarked, loading: checksLoading, refresh: refreshChecks } = useAttendanceChecks(
    session?.user?.id
  );

  const hasLocation = currentLatitude != null && currentLongitude != null;
  const distanceResult = hasLocation
    ? getDistanceAndInside(
        currentLatitude,
        currentLongitude,
        COACHING_LATITUDE,
        COACHING_LONGITUDE,
        ATTENDANCE_RADIUS_METERS
      )
    : null;
  const isInsidePremises = distanceResult?.isInsidePremises ?? false;

  const status = resolveAttendanceStatus(
    checksLoading,
    isHoliday,
    alreadyMarked || localMarked,
    hasLocation,
    isAccuracyAcceptable,
    isInsidePremises
  );
  const statusDisplay = getStatusDisplay(status);
  const busy = flowState === 'capturing_photo' || flowState === 'uploading_photo' || flowState === 'marking_attendance';
  const canMarkAttendance = status === 'open' && !busy;

  const accuracyPoor = hasLocation && !isAccuracyAcceptable;
  const locationStatusText = locationLoading
    ? 'Getting your location...'
    : locationPermission === 'denied'
      ? locationError ?? 'Location access is required to mark attendance.'
      : accuracyPoor
        ? 'Waiting for accurate location. Please move to an open area.'
        : locationPermission === 'granted' && hasLocation
          ? 'Location ready'
          : locationError ?? '-';

  const distanceDisplay = distanceResult == null
    ? null
    : distanceResult.distanceInMeters >= 1000
      ? `${(distanceResult.distanceInMeters / 1000).toFixed(1)} km`
      : `${Math.round(distanceResult.distanceInMeters)} m`;

  function showPopup(type: FeedbackType, title: string, message: string) {
    setPopup({ visible: true, type, title, message });
  }

  function resetCaptureState(nextState: CaptureFlowState = 'idle') {
    setCameraOpen(false);
    setCapturedPhotoUri(null);
    setRetakes(0);
    setFrozenContext(null);
    setCameraError(null);
    setFlowState(nextState);
  }

  async function handleStartAttendanceFlow() {
    if (!canMarkAttendance || !hasLocation || currentLatitude == null || currentLongitude == null) {
      return;
    }

    setFrozenContext({
      timestamp: new Date().toISOString(),
      latitude: currentLatitude,
      longitude: currentLongitude,
      accuracyMeters: typeof locationAccuracy === 'number' ? locationAccuracy : null,
    });

    const permissionStatus = cameraPermission?.granted
      ? true
      : (await requestCameraPermission()).granted;
    if (!permissionStatus) {
      setFlowState('error');
      showPopup('error', 'Camera Required', 'Camera permission is required to mark attendance.');
      resetCaptureState('idle');
      return;
    }

    setFlowState('capturing_photo');
    setCameraError(null);
    setCameraOpen(true);
  }

  async function handleTakePhoto() {
    if (!cameraRef.current) return;
    try {
      const picture = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        skipProcessing: false,
      });
      if (!picture?.uri) {
        throw new Error('Photo capture failed');
      }
      setCapturedPhotoUri(picture.uri);
    } catch (error: unknown) {
      setFlowState('error');
      showPopup('error', 'Camera Error', getReadableErrorMessage(error, 'Failed to capture photo.'));
      resetCaptureState('idle');
    }
  }

  function handleRetake() {
    if (retakes >= MAX_RETAKES) {
      showPopup('warning', 'Retake Limit', 'Retake limit reached. Please continue with this photo.');
      return;
    }
    setRetakes((r) => r + 1);
    setCapturedPhotoUri(null);
  }

  async function uploadPhotoToSignedUrl(uploadUrl: string, localUri: string, mimeType: string) {
    const localResponse = await fetch(localUri);
    const blob = await localResponse.blob();

    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': mimeType,
      },
      body: blob,
    });

    if (!uploadResponse.ok) {
      throw new Error('Photo upload failed');
    }
  }

  async function handleConfirmPhoto() {
    if (!capturedPhotoUri || !frozenContext) return;

    try {
      setFlowState('uploading_photo');
      setCameraOpen(false);

      const manipulated = await ImageManipulator.manipulateAsync(
        capturedPhotoUri,
        [{ resize: { width: 720 } }],
        { compress: 0.55, format: ImageManipulator.SaveFormat.JPEG }
      );
      const preparedUri = manipulated.uri;

      const { data: sessionData, error } = await supabase.auth.getSession();
      if (error || !sessionData.session?.access_token) {
        throw new Error('Not authenticated');
      }
      const token = sessionData.session.access_token;

      const uploadUrlResponse = await getAttendancePhotoUploadUrl(token, 'image/jpeg');
      const uploadPayload = uploadUrlResponse.data;
      if (!uploadPayload) throw new Error('Failed to get upload URL');

      await uploadPhotoToSignedUrl(uploadPayload.uploadUrl, preparedUri, 'image/jpeg');

      setFlowState('marking_attendance');
      const markResponse = await markAttendance(token, {
        photoUrl: uploadPayload.photoUrl,
        accuracyMeters: frozenContext.accuracyMeters,
      });

      setLocalMarked(true);
      setFlowState('success');
      showPopup('success', 'Success', markResponse.message || 'Attendance marked successfully.');
      await refreshChecks();
      resetCaptureState('success');
    } catch (error: unknown) {
      setFlowState('error');
      showPopup('error', 'Attendance Error', getReadableErrorMessage(error, 'Failed to mark attendance.'));
      resetCaptureState('idle');
    }
  }

  async function handleLogout() {
    try {
      await supabase.auth.signOut();
    } catch {
      showPopup('error', 'Logout Error', 'Unable to logout right now. Please try again.');
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

      {cameraOpen ? (
        <SafeAreaView style={styles.cameraOverlay} edges={['top']}>
          <View style={styles.cameraTopBar}>
            <Text style={styles.cameraGuide}>Ensure your face is clearly visible</Text>
            <Pressable onPress={() => resetCaptureState('idle')} style={styles.cameraClose}>
              <Text style={styles.cameraCloseText}>Cancel</Text>
            </Pressable>
          </View>
          {cameraPermission?.granted && !cameraError ? (
            <CameraView
              ref={cameraRef}
              style={styles.cameraView}
              facing="front"
              onMountError={(event:any) => {
                const message = event?.nativeEvent?.message || 'Camera failed to start.';
                setCameraError(message);
              }}
            />
          ) : (
            <View style={styles.cameraFallback}>
              <Text style={styles.cameraFallbackTitle}>Camera unavailable</Text>
              <Text style={styles.cameraFallbackText}>
                {cameraPermission?.granted
                  ? cameraError ?? 'Unable to open camera right now.'
                  : 'Camera permission is required to continue.'}
              </Text>
              {!cameraPermission?.granted ? (
                <Pressable
                  style={styles.cameraPermissionButton}
                  onPress={async () => {
                    const result = await requestCameraPermission();
                    if (!result.granted) {
                      showPopup('error', 'Camera Required', 'Please allow camera permission in settings.');
                    }
                  }}
                >
                  <Text style={styles.cameraPermissionText}>Allow Camera</Text>
                </Pressable>
              ) : null}
            </View>
          )}
          {capturedPhotoUri ? (
            <View style={styles.captureBadge}>
              <Text style={styles.captureBadgeText}>Photo captured</Text>
            </View>
          ) : null}
          <View style={styles.cameraActions}>
            {!capturedPhotoUri && cameraPermission?.granted && !cameraError ? (
              <Pressable onPress={handleTakePhoto} style={styles.captureButton}>
                <Text style={styles.captureButtonText}>Capture</Text>
              </Pressable>
            ) : !capturedPhotoUri ? (
              <Pressable onPress={() => resetCaptureState('idle')} style={styles.retakeButton}>
                <Text style={styles.retakeText}>Close</Text>
              </Pressable>
            ) : (
              <View style={styles.confirmRow}>
                <Pressable onPress={handleRetake} style={styles.retakeButton}>
                  <Text style={styles.retakeText}>Retake ({retakes}/{MAX_RETAKES})</Text>
                </Pressable>
                <Pressable onPress={handleConfirmPhoto} style={styles.confirmButton}>
                  <Text style={styles.confirmText}>Confirm</Text>
                </Pressable>
              </View>
            )}
          </View>
        </SafeAreaView>
      ) : null}

      <View style={styles.content}>
        <View style={styles.topActions}>
          <Pressable onPress={() => router.push('/(student)/calendar')} style={styles.calendarButton}>
            <Text style={styles.calendarText}>Calendar</Text>
          </Pressable>
          <Pressable onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        </View>
        <Text style={styles.title}>Attendance</Text>
        <Text style={styles.subtitle}>Mark your attendance for today</Text>

        <View style={styles.statusCard}>
          {checksLoading ? <ActivityIndicator size="small" color={Colors.primary} style={styles.statusLoader} /> : null}
          <Text style={[styles.statusLabel, { color: statusDisplay.color }]}>{statusDisplay.label}</Text>
          <Text style={styles.statusSubtext}>{statusDisplay.subtext}</Text>
          {flowState === 'uploading_photo' ? <Text style={styles.flowHint}>Uploading photo...</Text> : null}
          {flowState === 'marking_attendance' ? <Text style={styles.flowHint}>Finalizing attendance...</Text> : null}
        </View>

        <View style={styles.locationRow}>
          {locationLoading ? <ActivityIndicator size="small" color={Colors.primary} /> : null}
          <Text
            style={[
              styles.locationText,
              locationPermission === 'denied' && styles.locationTextDenied,
            ]}
            numberOfLines={2}
          >
            {locationStatusText}
          </Text>
          {!locationLoading && (locationError != null || locationPermission === 'granted' || accuracyPoor) ? (
            <Pressable onPress={() => { refreshLocation(); refreshChecks(); }} hitSlop={8}>
              <Text style={styles.locationRefresh}>Refresh</Text>
            </Pressable>
          ) : null}
        </View>

        {distanceResult != null ? (
          <View style={styles.distanceCard}>
            <Text
              style={[
                styles.distanceLabel,
                { color: distanceResult.isInsidePremises ? Colors.primary : Colors.error },
              ]}
            >
              {distanceResult.isInsidePremises ? 'Inside premises' : 'Outside premises'}
            </Text>
            <Text style={styles.distanceValue}>
              Distance from coaching centre: {distanceDisplay}
            </Text>
            <Text style={styles.distanceValue}>
              Your location: {currentLatitude?.toFixed(5)}, {currentLongitude?.toFixed(5)}
            </Text>
            {locationAccuracy != null ? (
              <Text style={[styles.distanceValue, !isAccuracyAcceptable && styles.accuracyPoor]}>
                GPS accuracy: {Math.round(locationAccuracy)} m
                {!isAccuracyAcceptable ? ' (need <=50 m to mark attendance)' : ''}
              </Text>
            ) : null}
          </View>
        ) : null}

        <Pressable
          style={({ pressed }) => [
            styles.ctaButton,
            pressed && canMarkAttendance && styles.ctaButtonPressed,
            !canMarkAttendance && styles.ctaButtonDisabled,
          ]}
          onPress={handleStartAttendanceFlow}
          disabled={!canMarkAttendance}
        >
          <Text style={[styles.ctaText, !canMarkAttendance && styles.ctaTextDisabled]}>
            {busy ? 'Processing...' : 'Mark Attendance'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  topActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  calendarButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Colors.white,
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
    backgroundColor: Colors.white,
    borderColor: Colors.border,
    borderWidth: 1,
  },
  logoutText: {
    fontFamily: Typography.medium,
    fontSize: 13,
    color: Colors.textMuted,
  },
  title: {
    fontFamily: Typography.heading,
    fontSize: 28,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontFamily: Typography.body,
    fontSize: 16,
    color: Colors.textMuted,
    marginBottom: Spacing.xl,
  },
  statusCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statusLoader: {
    marginBottom: Spacing.sm,
  },
  statusLabel: {
    fontFamily: Typography.heading,
    fontSize: 20,
    marginBottom: Spacing.sm,
  },
  statusSubtext: {
    fontFamily: Typography.medium,
    fontSize: 15,
    color: Colors.textMuted,
    lineHeight: 22,
  },
  flowHint: {
    marginTop: Spacing.sm,
    fontFamily: Typography.medium,
    fontSize: 13,
    color: Colors.primary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
    flexWrap: 'wrap',
  },
  locationText: {
    flex: 1,
    fontFamily: Typography.medium,
    fontSize: 13,
    color: Colors.textMuted,
  },
  locationTextDenied: {
    color: Colors.error,
  },
  locationRefresh: {
    fontFamily: Typography.medium,
    fontSize: 13,
    color: Colors.primary,
  },
  distanceCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    gap: 4,
  },
  distanceLabel: {
    fontFamily: Typography.heading,
    fontSize: 16,
  },
  distanceValue: {
    fontFamily: Typography.medium,
    fontSize: 13,
    color: Colors.textMuted,
  },
  accuracyPoor: {
    color: Colors.error,
  },
  ctaButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: Spacing.xl,
  },
  ctaButtonPressed: {
    opacity: 0.9,
  },
  ctaButtonDisabled: {
    backgroundColor: Colors.border,
  },
  ctaText: {
    color: Colors.white,
    fontFamily: Typography.heading,
    fontSize: 16,
  },
  ctaTextDisabled: {
    color: Colors.textMuted,
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 20,
  },
  cameraTopBar: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  cameraGuide: {
    color: '#fff',
    fontFamily: Typography.medium,
    fontSize: 13,
  },
  cameraClose: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  cameraCloseText: {
    color: '#fff',
    fontFamily: Typography.medium,
    fontSize: 12,
  },
  cameraView: {
    flex: 1,
  },
  captureBadge: {
    position: 'absolute',
    right: Spacing.md,
    bottom: 92,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  captureBadgeText: {
    color: Colors.white,
    fontFamily: Typography.medium,
    fontSize: 12,
  },
  cameraFallback: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  cameraFallbackTitle: {
    color: Colors.white,
    fontFamily: Typography.heading,
    fontSize: 20,
    textAlign: 'center',
  },
  cameraFallbackText: {
    color: '#d7d7d7',
    fontFamily: Typography.medium,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  cameraPermissionButton: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: 999,
    minWidth: 140,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  cameraPermissionText: {
    color: Colors.white,
    fontFamily: Typography.heading,
    fontSize: 14,
  },
  cameraActions: {
    padding: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  captureButton: {
    backgroundColor: Colors.primary,
    borderRadius: 999,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonText: {
    color: Colors.white,
    fontFamily: Typography.heading,
    fontSize: 15,
  },
  confirmRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  retakeButton: {
    flex: 1,
    backgroundColor: '#2d2d2d',
    borderRadius: 999,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retakeText: {
    color: '#fff',
    fontFamily: Typography.medium,
    fontSize: 13,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 999,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmText: {
    color: Colors.white,
    fontFamily: Typography.heading,
    fontSize: 14,
  },
});
