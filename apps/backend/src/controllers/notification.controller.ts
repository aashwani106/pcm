import { Response } from 'express';
import {
  getParentNotifications,
  readParentNotification,
  runAbsentParentNotifications,
} from '../services/notification.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import { getTodayLocalISODate } from '../utils/date';

function parseDateOrDefault(rawDate: string | undefined): string {
  if (!rawDate) {
    return getTodayLocalISODate();
  }
  const isDateFormat = /^\d{4}-\d{2}-\d{2}$/.test(rawDate);
  if (!isDateFormat) {
    throw new ApiError(400, 'Invalid date format. Use YYYY-MM-DD');
  }
  return rawDate;
}

export async function runAbsentNotifications(req: AuthenticatedRequest, res: Response) {
  const date = parseDateOrDefault(
    typeof req.query.date === 'string' ? req.query.date : undefined
  );

  const data = await runAbsentParentNotifications(date);
  return res
    .status(200)
    .json(new ApiResponse(true, data, 'Absent notifications processed', null));
}

export async function getMyNotifications(req: AuthenticatedRequest, res: Response) {
  const userId = req.user!.id;
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  const data = await getParentNotifications(userId, limit);

  return res
    .status(200)
    .json(new ApiResponse(true, data, 'Notifications loaded successfully', null));
}

export async function markMyNotificationRead(req: AuthenticatedRequest, res: Response) {
  const userId = req.user!.id;
  const notificationId = typeof req.params.id === 'string' ? req.params.id : '';

  if (!notificationId) {
    throw new ApiError(400, 'Notification id is required');
  }

  const data = await readParentNotification(userId, notificationId);
  return res.status(200).json(new ApiResponse(true, data, 'Notification marked as read', null));
}
