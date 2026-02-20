import { Response } from 'express';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { supabaseAdmin } from '../config/supabase';
import {
  approveJoinRequestService,
  createJoinRequestService,
  endLiveSessionService,
  getJoinRequestStatusService,
  getLiveSessionStateService,
  joinLiveSessionAsTeacherService,
  listJoinRequestsForTeacherService,
  rejectJoinRequestService,
  startLiveSessionService,
} from '../services/live-session.service';
import {
  emitLiveJoinRequestEvent,
  subscribeLiveJoinRequestEvents,
} from '../services/live-session.events';

function getRequiredParam(value: string | string[] | undefined, field: string) {
  const parsed = Array.isArray(value) ? value[0] : value;
  if (!parsed) {
    throw new ApiError(400, `${field} is required`);
  }
  return parsed;
}

function getAuthUserId(req: AuthenticatedRequest) {
  if (!req.user?.id) {
    throw new ApiError(401, 'Unauthorized');
  }
  return req.user.id;
}

export async function startLiveSession(req: AuthenticatedRequest, res: Response) {
  const teacherId = getAuthUserId(req);
  const result = await startLiveSessionService(teacherId);
  return res.json(new ApiResponse(true, result, 'Live session started', null));
}

export async function getLiveSessionState(req: AuthenticatedRequest, res: Response) {
  const sessionId = getRequiredParam(req.params.id, 'Session id');
  const result = await getLiveSessionStateService(sessionId);
  return res.json(new ApiResponse(true, result, 'Session state loaded', null));
}

export async function createJoinRequest(req: AuthenticatedRequest, res: Response) {
  const sessionId = getRequiredParam(req.params.id, 'Session id');
  const displayName =
    typeof req.body?.displayName === 'string' ? req.body.displayName : '';
  const result = await createJoinRequestService(sessionId, displayName);
  emitLiveJoinRequestEvent({
    type: 'created',
    sessionId,
    request: {
      id: result.requestId,
      displayName: result.displayName,
      status: result.status,
      createdAt: result.createdAt,
    },
  });
  return res.status(201).json(new ApiResponse(true, result, 'Join request created', null));
}

export async function listJoinRequests(req: AuthenticatedRequest, res: Response) {
  const sessionId = getRequiredParam(req.params.id, 'Session id');
  const teacherId = getAuthUserId(req);
  const result = await listJoinRequestsForTeacherService(sessionId, teacherId);
  return res.json(new ApiResponse(true, result, 'Join requests loaded', null));
}

export async function getJoinRequestStatus(req: AuthenticatedRequest, res: Response) {
  const sessionId = getRequiredParam(req.params.id, 'Session id');
  const requestId = getRequiredParam(req.params.requestId, 'Request id');
  const result = await getJoinRequestStatusService(sessionId, requestId);
  return res.json(new ApiResponse(true, result, 'Join request state loaded', null));
}

export async function approveJoinRequest(req: AuthenticatedRequest, res: Response) {
  const sessionId = getRequiredParam(req.params.id, 'Session id');
  const requestId = getRequiredParam(req.params.requestId, 'Request id');
  const teacherId = getAuthUserId(req);
  const result = await approveJoinRequestService(sessionId, requestId, teacherId);
  const requestState = await getJoinRequestStatusService(sessionId, requestId);
  emitLiveJoinRequestEvent({
    type: 'updated',
    sessionId,
    request: {
      id: result.id,
      status: 'approved',
      token: requestState.token,
    },
  });
  return res.json(new ApiResponse(true, result, 'Join request approved', null));
}

export async function rejectJoinRequest(req: AuthenticatedRequest, res: Response) {
  const sessionId = getRequiredParam(req.params.id, 'Session id');
  const requestId = getRequiredParam(req.params.requestId, 'Request id');
  const teacherId = getAuthUserId(req);
  const result = await rejectJoinRequestService(sessionId, requestId, teacherId);
  emitLiveJoinRequestEvent({
    type: 'updated',
    sessionId,
    request: {
      id: result.id,
      status: 'rejected',
      token: null,
    },
  });
  return res.json(new ApiResponse(true, result, 'Join request rejected', null));
}

export async function endLiveSession(req: AuthenticatedRequest, res: Response) {
  const sessionId = getRequiredParam(req.params.id, 'Session id');
  const teacherId = getAuthUserId(req);
  const result = await endLiveSessionService(sessionId, teacherId);
  return res.json(new ApiResponse(true, result, 'Live session ended', null));
}

export async function joinLiveSessionAsTeacher(req: AuthenticatedRequest, res: Response) {
  const sessionId = getRequiredParam(req.params.id, 'Session id');
  const teacherId = getAuthUserId(req);
  const result = await joinLiveSessionAsTeacherService(sessionId, teacherId);
  return res.json(new ApiResponse(true, result, 'Teacher token issued', null));
}

async function requireQueryToken(req: AuthenticatedRequest) {
  const token =
    typeof req.query.access_token === 'string' ? req.query.access_token : null;
  if (!token) {
    throw new ApiError(401, 'Missing access token');
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user?.id) {
    throw new ApiError(401, 'Invalid access token');
  }

  return data.user.id;
}

function initializeSse(res: Response) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
}

export async function streamSessionJoinRequests(
  req: AuthenticatedRequest,
  res: Response
) {
  const sessionId = getRequiredParam(req.params.id, 'Session id');
  const userId = await requireQueryToken(req);

  await listJoinRequestsForTeacherService(sessionId, userId);

  initializeSse(res);
  res.write(`event: ready\ndata: ${JSON.stringify({ ok: true })}\n\n`);

  const unsubscribe = subscribeLiveJoinRequestEvents((event) => {
    if (event.sessionId !== sessionId) {
      return;
    }
    res.write(`event: request\ndata: ${JSON.stringify(event)}\n\n`);
  });

  req.on('close', () => {
    unsubscribe();
    res.end();
  });
}

export async function streamJoinRequestStatus(
  req: AuthenticatedRequest,
  res: Response
) {
  const sessionId = getRequiredParam(req.params.id, 'Session id');
  const requestId = getRequiredParam(req.params.requestId, 'Request id');

  await getJoinRequestStatusService(sessionId, requestId);

  initializeSse(res);
  res.write(`event: ready\ndata: ${JSON.stringify({ ok: true })}\n\n`);

  const unsubscribe = subscribeLiveJoinRequestEvents((event) => {
    if (event.sessionId !== sessionId) {
      return;
    }
    if (event.request.id !== requestId) {
      return;
    }
    res.write(`event: request\ndata: ${JSON.stringify(event)}\n\n`);
  });

  req.on('close', () => {
    unsubscribe();
    res.end();
  });
}
