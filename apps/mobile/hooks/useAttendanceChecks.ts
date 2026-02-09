import { useState, useEffect, useCallback } from 'react';
import { isTodayHoliday, hasAttendanceToday } from '../services/attendance';

export interface AttendanceChecksResult {
    isHoliday: boolean;
    alreadyMarked: boolean;
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

/**
 * Read-only Supabase checks for attendance screen: is today a holiday? has attendance today?
 */
export function useAttendanceChecks(userId: string | undefined): AttendanceChecksResult {
    const [isHoliday, setIsHoliday] = useState(false);
    const [alreadyMarked, setAlreadyMarked] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchChecks = useCallback(async () => {
        if (!userId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const [holiday, marked] = await Promise.all([
                isTodayHoliday(),
                hasAttendanceToday(userId),
            ]);
            setIsHoliday(holiday);
            setAlreadyMarked(marked);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load');
            setIsHoliday(false);
            setAlreadyMarked(false);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchChecks();
    }, [fetchChecks]);

    return { isHoliday, alreadyMarked, loading, error, refresh: fetchChecks };
}
