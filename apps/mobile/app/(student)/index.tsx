import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { useAttendanceLocation } from '../../hooks/useAttendanceLocation';
import { useAttendanceChecks } from '../../hooks/useAttendanceChecks';
import { getDistanceAndInside } from '../../utils/distance';
import { supabase } from '../../services/supabase';
import { getReadableErrorMessage, markAttendance } from '../../services/backend';
import { isWithinTimeWindow, getTimeWindowStatus } from '../../utils/timeWindow';
import { FeedbackPopup, FeedbackType } from '../../components/feedback-popup';
import {
    COACHING_LATITUDE,
    COACHING_LONGITUDE,
    ATTENDANCE_RADIUS_METERS,
} from '../../constants/attendance';

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

/**
 * Resolves one final attendance status. Order: holiday → already_marked → no_location → accuracy_poor → time → outside → open.
 * no_location = permission / GPS not ready; accuracy_poor = indoors / weak signal.
 */
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



export default function StudentAttendanceScreen() {
    const { session } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
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
    const { isHoliday, alreadyMarked, loading: checksLoading, refresh: refreshChecks } = useAttendanceChecks(session?.user?.id);

    const hasLocation = currentLatitude != null && currentLongitude != null;
    const distanceResult =
        hasLocation
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
        alreadyMarked,
        hasLocation,
        isAccuracyAcceptable,
        isInsidePremises
    );
    const statusDisplay = getStatusDisplay(status);
    const canMarkAttendance = status === 'open' && !isSubmitting;

    const accuracyPoor = hasLocation && !isAccuracyAcceptable;
    const locationStatusText =
        locationLoading
            ? 'Getting your location…'
            : locationPermission === 'denied'
                ? locationError ?? 'Location access is required to mark attendance.'
                : accuracyPoor
                    ? 'Waiting for accurate location. Please move to an open area.'
                    : locationPermission === 'granted' && hasLocation
                        ? 'Location ready'
                        : locationError ?? '—';

    const distanceDisplay =
        distanceResult == null
            ? null
            : distanceResult.distanceInMeters >= 1000
                ? `${(distanceResult.distanceInMeters / 1000).toFixed(1)} km`
                : `${Math.round(distanceResult.distanceInMeters)} m`;

    function showPopup(type: FeedbackType, title: string, message: string) {
        setPopup({ visible: true, type, title, message });
    }

    async function handleMarkAttendance() {
        setIsSubmitting(true);
        try {
            const { data, error } = await supabase.auth.getSession();
            if (error) {
                throw new Error(error.message);
            }
            const session = data.session;
            if (!session) {
                throw new Error('Not authenticated');
            }
            const token = session.access_token;
            if (!token) throw new Error('Not authenticated');

            const response = await markAttendance(token);
            showPopup('success', 'Success', response.message || 'Attendance marked successfully.');
            await refreshChecks();
        } catch (error: unknown) {
            showPopup('error', 'Attendance Error', getReadableErrorMessage(error, 'Failed to mark attendance.'));
        } finally {
            setIsSubmitting(false);
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
            <View style={styles.content}>
                <View style={styles.topActions}>
                    <Pressable onPress={handleLogout} style={styles.logoutButton}>
                        <Text style={styles.logoutText}>Logout</Text>
                    </Pressable>
                </View>
                <Text style={styles.title}>Attendance</Text>
                <Text style={styles.subtitle}>Mark your attendance for today</Text>

                <View style={styles.statusCard}>
                    {checksLoading ? (
                        <ActivityIndicator size="small" color={Colors.primary} style={styles.statusLoader} />
                    ) : null}
                    <Text style={[styles.statusLabel, { color: statusDisplay.color }]}>{statusDisplay.label}</Text>
                    <Text style={styles.statusSubtext}>{statusDisplay.subtext}</Text>
                </View>

                <View style={styles.locationRow}>
                    {locationLoading ? (
                        <ActivityIndicator size="small" color={Colors.primary} />
                    ) : null}
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
                                {!isAccuracyAcceptable ? ' (need ≤50 m to mark attendance)' : ''}
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
                    onPress={handleMarkAttendance }
                    disabled={!canMarkAttendance}
                >
                    <Text style={[styles.ctaText, !canMarkAttendance && styles.ctaTextDisabled]}>
                        {isSubmitting ? 'Marking...' : 'Mark Attendance'}
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
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginBottom: Spacing.lg,
        flexWrap: 'wrap',
    },
    locationText: {
        fontFamily: Typography.medium,
        fontSize: 14,
        color: Colors.textMuted,
        flex: 1,
    },
    locationTextDenied: {
        color: Colors.error,
    },
    locationRefresh: {
        fontFamily: Typography.body,
        fontSize: 14,
        color: Colors.primary,
    },
    distanceCard: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    distanceLabel: {
        fontFamily: Typography.heading,
        fontSize: 18,
        marginBottom: Spacing.xs,
    },
    distanceValue: {
        fontFamily: Typography.medium,
        fontSize: 14,
        color: Colors.textMuted,
    },
    accuracyPoor: {
        color: Colors.error,
    },
    ctaButton: {
        backgroundColor: Colors.primary,
        borderRadius: 28,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
    },
    ctaButtonPressed: {
        opacity: 0.9,
    },
    ctaButtonDisabled: {
        opacity: 0.6,
    },
    ctaText: {
        fontFamily: Typography.heading,
        fontSize: 18,
        color: Colors.white,
    },
    ctaTextDisabled: {
        color: Colors.white,
        opacity: 0.9,
    },
});
