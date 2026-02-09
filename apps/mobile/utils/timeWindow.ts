import {
    ATTENDANCE_START_HOUR,
    ATTENDANCE_START_MINUTE,
    ATTENDANCE_END_HOUR,
    ATTENDANCE_END_MINUTE,
} from '../constants/attendance';

/**
 * Returns true if the given time (local) is within the attendance window [start, end] inclusive.
 */
export function isWithinTimeWindow(date: Date = new Date()): boolean {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const currentMinutes = hours * 60 + minutes;
    const startMinutes = ATTENDANCE_START_HOUR * 60 + ATTENDANCE_START_MINUTE;
    const endMinutes = ATTENDANCE_END_HOUR * 60 + ATTENDANCE_END_MINUTE;
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

/**
 * Returns 'not_started' | 'open' | 'closed' based on current time vs window.
 */
export function getTimeWindowStatus(date: Date = new Date()): 'not_started' | 'open' | 'closed' {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const currentMinutes = hours * 60 + minutes;
    const startMinutes = ATTENDANCE_START_HOUR * 60 + ATTENDANCE_START_MINUTE;
    const endMinutes = ATTENDANCE_END_HOUR * 60 + ATTENDANCE_END_MINUTE;
    if (currentMinutes < startMinutes) return 'not_started';
    if (currentMinutes > endMinutes) return 'closed';
    return 'open';
}
