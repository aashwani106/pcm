import { Response } from 'express';
import {
  getAttendancePhotoViewUrl,
  markAttendanceWithPhoto,
  reviewAttendanceByAdminOrParent,
  resolveStudentIdForUser,
} from '../services/attendance.service';
import { getAttendancePhotoUploadUrl } from '../services/storage.service';
import { ApiResponse } from '../utils/ApiResponse';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { ApiError } from '../utils/ApiError';

export async function markAttendance(req: AuthenticatedRequest, res: Response) {
  const userId = req.user!.id;
  const photoUrl = typeof req.body?.photoUrl === 'string' ? req.body.photoUrl.trim() : '';
  const accuracyMetersRaw = req.body?.accuracyMeters;
  const accuracyMeters =
    typeof accuracyMetersRaw === 'number' && Number.isFinite(accuracyMetersRaw)
      ? accuracyMetersRaw
      : null;

  if (!photoUrl) {
    throw new ApiError(400, 'photoUrl is required');
  }

  const data = await markAttendanceWithPhoto({ userId, photoUrl, accuracyMeters });

  return res
    .status(200)
    .json(new ApiResponse(true, data, 'Attendance marked successfully', null));
}

export async function getPhotoUploadUrl(req: AuthenticatedRequest, res: Response) {
  const userId = req.user!.id;
  const mimeType = typeof req.body?.mimeType === 'string' ? req.body.mimeType.trim() : '';
  if (!mimeType) {
    throw new ApiError(400, 'mimeType is required');
  }

  const studentId = await resolveStudentIdForUser(userId);
  const data = await getAttendancePhotoUploadUrl({ studentId, mimeType });

  return res
    .status(200)
    .json(new ApiResponse(true, data, 'Photo upload URL generated successfully', null));
}

export async function reviewAttendance(req: AuthenticatedRequest, res: Response) {
  const userId = req.user!.id;
  const attendanceId =
    typeof req.body?.attendance_id === 'string' ? req.body.attendance_id.trim() : '';
  const status = req.body?.review_status;
  const reviewNote = typeof req.body?.review_note === 'string' ? req.body.review_note : null;

  if (!attendanceId) {
    throw new ApiError(400, 'attendance_id is required');
  }
  if (status !== 'accepted' && status !== 'flagged') {
    throw new ApiError(400, "review_status must be 'accepted' or 'flagged'");
  }

  const data = await reviewAttendanceByAdminOrParent({
    userId,
    attendanceId,
    status,
    note: reviewNote,
  });

  return res
    .status(200)
    .json(new ApiResponse(true, data, 'Attendance review updated successfully', null));
}

export async function getAttendancePhotoViewUrlForRecord(
  req: AuthenticatedRequest,
  res: Response
) {
  const userId = req.user!.id;
  const attendanceId =
    typeof req.params.attendanceId === 'string' ? req.params.attendanceId.trim() : '';
  if (!attendanceId) {
    throw new ApiError(400, 'attendanceId is required');
  }

  const data = await getAttendancePhotoViewUrl({ userId, attendanceId });
  return res
    .status(200)
    .json(new ApiResponse(true, data, 'Attendance photo URL generated successfully', null));
}
