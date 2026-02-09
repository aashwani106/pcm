import { useState, useCallback, useEffect } from 'react';
import * as Location from 'expo-location';
import { MAX_LOCATION_ACCURACY_METERS } from '../constants/attendance';

export type LocationPermissionStatus = 'idle' | 'granted' | 'denied';

export interface AttendanceLocationResult {
    locationPermission: LocationPermissionStatus;
    currentLatitude: number | null;
    currentLongitude: number | null;
    locationAccuracy: number | null;
    locationTimestamp: number | null;
    isAccuracyAcceptable: boolean;
    locationError: string | null;
    isLoading: boolean;
    refresh: () => Promise<void>;
}

const LOCATION_DENIED_MESSAGE = 'Location access is required to mark attendance.';
const LOCATION_UNAVAILABLE_MESSAGE = 'Unable to get your location. Please try again.';

/**
 * Task 2: Location permission + current position.
 * Device-only. No Supabase, no distance check, no attendance status.
 * Answers: "Where is the student right now?"
 */
export function useAttendanceLocation(): AttendanceLocationResult {
    const [locationPermission, setLocationPermission] = useState<LocationPermissionStatus>('idle');
    const [currentLatitude, setCurrentLatitude] = useState<number | null>(null);
    const [currentLongitude, setCurrentLongitude] = useState<number | null>(null);
    const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
    const [locationTimestamp, setLocationTimestamp] = useState<number | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const requestAndFetch = useCallback(async () => {
        setIsLoading(true);
        setLocationError(null);

        try {
            const { status } = await Location.requestForegroundPermissionsAsync();

            if (status !== 'granted') {
                setLocationPermission('denied');
                setCurrentLatitude(null);
                setCurrentLongitude(null);
                setLocationAccuracy(null);
                setLocationTimestamp(null);
                setLocationError(LOCATION_DENIED_MESSAGE);
                setIsLoading(false);
                return;
            }

            setLocationPermission('granted');

            const position = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });

            setCurrentLatitude(position.coords.latitude);
            setCurrentLongitude(position.coords.longitude);
            setLocationAccuracy(position.coords.accuracy ?? null);
            setLocationTimestamp(position.timestamp ?? null);
            setLocationError(null);
        } catch {
            setLocationPermission('granted');
            setCurrentLatitude(null);
            setCurrentLongitude(null);
            setLocationAccuracy(null);
            setLocationTimestamp(null);
            setLocationError(LOCATION_UNAVAILABLE_MESSAGE);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        requestAndFetch();
    }, [requestAndFetch]);

    const isAccuracyAcceptable =
        locationAccuracy !== null &&
        locationAccuracy <= MAX_LOCATION_ACCURACY_METERS;

    return {
        locationPermission,
        currentLatitude,
        currentLongitude,
        locationAccuracy,
        locationTimestamp,
        isAccuracyAcceptable,
        locationError,
        isLoading,
        refresh: requestAndFetch,
    };
}
