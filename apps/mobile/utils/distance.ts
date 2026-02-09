/**
 * Task 3: Distance calculation (pure math).
 * Haversine formula — industry standard for distance between two points on Earth.
 * No React, no Supabase, no side effects. Easy to test and reuse (e.g. backend).
 */

const EARTH_RADIUS_METERS = 6_371_000;

function toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
}

/**
 * Distance between two points (WGS84) in meters, using Haversine formula.
 */
export function getDistanceInMeters(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const φ1 = toRadians(lat1);
    const φ2 = toRadians(lat2);
    const Δφ = toRadians(lat2 - lat1);
    const Δλ = toRadians(lon2 - lon1);

    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return EARTH_RADIUS_METERS * c;
}

export interface DistanceResult {
    distanceInMeters: number;
    isInsidePremises: boolean;
}

/**
 * Computes distance from student position to coaching centre and whether they are inside the allowed radius.
 */
export function getDistanceAndInside(
    studentLat: number,
    studentLon: number,
    coachingLat: number,
    coachingLon: number,
    radiusMeters: number
): DistanceResult {
    const distanceInMeters = getDistanceInMeters(studentLat, studentLon, coachingLat, coachingLon);
    const isInsidePremises = distanceInMeters <= radiusMeters;
    return { distanceInMeters, isInsidePremises };
}
