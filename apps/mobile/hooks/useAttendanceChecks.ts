import { useState, useEffect, useCallback } from 'react';
import { AttendanceLockReasonCode, getAttendanceState } from '../services/backend';

export interface AttendanceChecksResult {
    isHoliday: boolean;
    alreadyMarked: boolean;
    canMark: boolean;
    reasonCode: AttendanceLockReasonCode;
    reasonMessage: string;
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

/**
 * Read-only backend checks for attendance state and lock reasons.
 */
export function useAttendanceChecks(accessToken: string | undefined): AttendanceChecksResult {
    const [isHoliday, setIsHoliday] = useState(false);
    const [alreadyMarked, setAlreadyMarked] = useState(false);
    const [canMark, setCanMark] = useState(false);
    const [reasonCode, setReasonCode] = useState<AttendanceLockReasonCode>('none');
    const [reasonMessage, setReasonMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchChecks = useCallback(async () => {
        if (!accessToken) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const response = await getAttendanceState(accessToken);
            const payload = response.data;
            if (!payload) throw new Error('No attendance state data');

            setIsHoliday(payload.is_holiday);
            setAlreadyMarked(payload.already_marked);
            setCanMark(payload.can_mark);
            setReasonCode(payload.reason_code);
            setReasonMessage(payload.reason_message);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load');
            setIsHoliday(false);
            setAlreadyMarked(false);
            setCanMark(false);
            setReasonCode('none');
            setReasonMessage('');
        } finally {
            setLoading(false);
        }
    }, [accessToken]);

    useEffect(() => {
        fetchChecks();
    }, [fetchChecks]);

    return {
        isHoliday,
        alreadyMarked,
        canMark,
        reasonCode,
        reasonMessage,
        loading,
        error,
        refresh: fetchChecks,
    };
}
