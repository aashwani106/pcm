import { randomUUID } from 'crypto';
import { supabaseAdmin } from '../config/supabase';
import { ApiError } from '../utils/ApiError';

const ATTENDANCE_PHOTOS_BUCKET = 'attendance-photos';

function getImageExtension(mimeType: string) {
  const safe = mimeType.trim().toLowerCase();
  if (!safe.startsWith('image/')) {
    throw new ApiError(400, 'Only image uploads are allowed');
  }

  if (safe === 'image/jpeg' || safe === 'image/jpg') return 'jpg';
  if (safe === 'image/png') return 'png';
  if (safe === 'image/webp') return 'webp';
  return 'jpg';
}

export interface AttendancePhotoUploadUrlResult {
  uploadUrl: string;
  photoUrl: string;
}

export async function getAttendancePhotoUploadUrl(params: {
  studentId: string;
  mimeType: string;
}): Promise<AttendancePhotoUploadUrlResult> {
  const { studentId, mimeType } = params;
  if (!studentId) {
    throw new ApiError(400, 'studentId is required');
  }

  const ext = getImageExtension(mimeType);
  const fileName = `${randomUUID()}.${ext}`;
  const filePath = `${studentId}/${fileName}`;

  const { data, error } = await supabaseAdmin.storage
    .from(ATTENDANCE_PHOTOS_BUCKET)
    .createSignedUploadUrl(filePath);

  if (error || !data?.signedUrl) {
    const detail =
      error && typeof error.message === 'string'
        ? `: ${error.message}`
        : '';
    throw new ApiError(500, `Failed to generate upload URL${detail}`, error);
  }

  return {
    uploadUrl: data.signedUrl,
    photoUrl: `${ATTENDANCE_PHOTOS_BUCKET}/${filePath}`,
  };
}

export function assertPhotoPathBelongsToStudent(photoUrl: string, studentId: string) {
  if (!photoUrl || typeof photoUrl !== 'string') {
    throw new ApiError(400, 'photoUrl is required');
  }

  const normalized = photoUrl.trim();
  const prefix = `${ATTENDANCE_PHOTOS_BUCKET}/${studentId}/`;
  if (!normalized.startsWith(prefix)) {
    throw new ApiError(400, 'Invalid photoUrl path');
  }
}

export async function getAttendancePhotoSignedViewUrl(photoUrl: string) {
  const normalized = photoUrl.trim();
  const bucketPrefix = `${ATTENDANCE_PHOTOS_BUCKET}/`;
  if (!normalized.startsWith(bucketPrefix)) {
    throw new ApiError(400, 'Invalid attendance photo path');
  }

  const filePath = normalized.slice(bucketPrefix.length);
  if (!filePath) {
    throw new ApiError(400, 'Invalid attendance photo path');
  }

  const { data, error } = await supabaseAdmin.storage
    .from(ATTENDANCE_PHOTOS_BUCKET)
    .createSignedUrl(filePath, 5 * 60);

  if (error || !data?.signedUrl) {
    const detail =
      error && typeof error.message === 'string'
        ? `: ${error.message}`
        : '';
    throw new ApiError(500, `Failed to generate photo view URL${detail}`, error);
  }

  return data.signedUrl;
}
