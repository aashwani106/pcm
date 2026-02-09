/**
 * Attendance configuration (read-only).
 * Single source of truth for geofence and time window.
 * No logic — only constants.
 */

/** Coaching centre latitude (WGS84). */
export const COACHING_LATITUDE = 26.89644;

/** Coaching centre longitude (WGS84). */
export const COACHING_LONGITUDE = 80.92831;

/** Allowed radius in meters. Student must be within this distance to mark attendance. */
export const ATTENDANCE_RADIUS_METERS = 50;

/**
 * Maximum allowed GPS accuracy (in meters).
 * If accuracy is worse than this, location is unreliable.
 */
export const MAX_LOCATION_ACCURACY_METERS = 100;

/** Attendance window: start (local time). */
export const ATTENDANCE_START_HOUR = 7;
export const ATTENDANCE_START_MINUTE = 30;

/** Attendance window: end (local time). */
export const ATTENDANCE_END_HOUR = 8;
export const ATTENDANCE_END_MINUTE = 15;
