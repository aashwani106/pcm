import { supabaseAdmin } from '../config/supabase';
import { ApiError } from '../utils/ApiError';
import { generateLiveKitToken } from './livekit.service';
import { randomUUID } from 'crypto';

type LiveSessionStatus = 'live' | 'ended';
type LiveJoinRequestStatus = 'pending' | 'approved' | 'rejected';

type LiveSessionRow = {
  id: string;
  teacher_id: string;
  room_name: string;
  status: LiveSessionStatus;
  capacity: number;
  created_at: string;
  started_at: string | null;
  expires_at: string | null;
  ended_at: string | null;
};

type LiveJoinRequestRow = {
  id: string;
  session_id: string;
  display_name: string;
  status: LiveJoinRequestStatus;
  token: string | null;
  created_at: string;
};

function sanitizeDisplayName(name: string) {
  return name.trim().replace(/\s+/g, ' ').slice(0, 80);
}

async function getSessionById(sessionId: string) {
  const { data, error } = await supabaseAdmin
    .from('live_sessions')
    .select('*')
    .eq('id', sessionId)
    .single<LiveSessionRow>();

  if (error || !data) {
    throw new ApiError(404, 'Session not found');
  }

  return data;
}

function getFallbackExpiryIso(session: LiveSessionRow) {
  const baseIso = session.expires_at ?? session.started_at ?? session.created_at;
  return new Date(new Date(baseIso).getTime() + 2 * 60 * 60 * 1000).toISOString();
}

async function expireSessionIfNeeded(session: LiveSessionRow) {
  if (session.status !== 'live') {
    return session;
  }

  const expiryIso = session.expires_at ?? getFallbackExpiryIso(session);
  const isExpired = new Date() > new Date(expiryIso);
  if (!isExpired) {
    return session;
  }

  const { data, error } = await supabaseAdmin
    .from('live_sessions')
    .update({
      status: 'ended',
      ended_at: new Date().toISOString(),
      expires_at: expiryIso,
    })
    .eq('id', session.id)
    .select('*')
    .single<LiveSessionRow>();

  if (error || !data) {
    throw new ApiError(500, 'Failed to expire live session');
  }

  return data;
}

async function ensureLiveSessionOrThrow(session: LiveSessionRow) {
  const resolved = await expireSessionIfNeeded(session);
  if (resolved.status !== 'live') {
    throw new ApiError(400, 'Session is not live');
  }
  return resolved;
}

async function getApprovedRequestsCount(sessionId: string) {
  const { count, error } = await supabaseAdmin
    .from('live_join_requests')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', sessionId)
    .eq('status', 'approved');

  if (error) {
    throw new ApiError(500, 'Failed to load session capacity usage');
  }

  return count ?? 0;
}

async function ensureTeacherOwnsSession(sessionId: string, teacherId: string) {
  const session = await getSessionById(sessionId);
  if (session.teacher_id !== teacherId) {
    throw new ApiError(403, 'Not allowed to manage this session');
  }
  return session;
}

export async function startLiveSessionService(teacherId: string) {
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  const roomName = `instant_${randomUUID()}`;

  const { data, error } = await supabaseAdmin
    .from('live_sessions')
    .insert({
      teacher_id: teacherId,
      room_name: roomName,
      status: 'live',
      created_at: now,
      started_at: now,
      expires_at: expiresAt,
    })
    .select('*')
    .single<LiveSessionRow>();

  if (error || !data) {
    throw new ApiError(500, 'Failed to start live session');
  }

  const teacherToken = await generateLiveKitToken({
    userId: teacherId,
    roomName: data.room_name,
    role: 'teacher',
  });

  return {
    sessionId: data.id,
    roomName: data.room_name,
    status: data.status,
    capacity: data.capacity,
    startedAt: data.started_at,
    expiresAt: data.expires_at,
    sharePath: `/live/${data.id}`,
    teacherToken,
  };
}

export async function getLiveSessionStateService(sessionId: string) {
  const session = await expireSessionIfNeeded(await getSessionById(sessionId));
  const approvedCount = await getApprovedRequestsCount(session.id);
  return {
    sessionId: session.id,
    roomName: session.room_name,
    status: session.status,
    capacity: session.capacity,
    approvedCount,
    startedAt: session.started_at,
    expiresAt: session.expires_at ?? getFallbackExpiryIso(session),
    createdAt: session.created_at,
    endedAt: session.ended_at,
  };
}

export async function createJoinRequestService(sessionId: string, rawDisplayName: string) {
  const session = await ensureLiveSessionOrThrow(await getSessionById(sessionId));

  const displayName = sanitizeDisplayName(rawDisplayName);
  if (!displayName) {
    throw new ApiError(400, 'Display name is required');
  }

  const { data, error } = await supabaseAdmin
    .from('live_join_requests')
    .insert({
      session_id: sessionId,
      display_name: displayName,
      status: 'pending',
    })
    .select('*')
    .single<LiveJoinRequestRow>();

  if (error || !data) {
    throw new ApiError(500, 'Failed to create join request');
  }

  return {
    requestId: data.id,
    status: data.status,
    displayName: data.display_name,
    createdAt: data.created_at,
  };
}

export async function listJoinRequestsForTeacherService(sessionId: string, teacherId: string) {
  await ensureTeacherOwnsSession(sessionId, teacherId);

  const { data, error } = await supabaseAdmin
    .from('live_join_requests')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .returns<LiveJoinRequestRow[]>();

  if (error) {
    throw new ApiError(500, 'Failed to load join requests');
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    displayName: row.display_name,
    status: row.status,
    createdAt: row.created_at,
  }));
}

export async function getJoinRequestStatusService(sessionId: string, requestId: string) {
  const session = await getSessionById(sessionId);
  const { data, error } = await supabaseAdmin
    .from('live_join_requests')
    .select('*')
    .eq('id', requestId)
    .eq('session_id', session.id)
    .single<LiveJoinRequestRow>();

  if (error || !data) {
    throw new ApiError(404, 'Join request not found');
  }

  return {
    id: data.id,
    status: data.status,
    token: data.token,
    displayName: data.display_name,
  };
}

export async function approveJoinRequestService(
  sessionId: string,
  requestId: string,
  teacherId: string
) {
  const session = await ensureLiveSessionOrThrow(
    await ensureTeacherOwnsSession(sessionId, teacherId)
  );

  const approvedCount = await getApprovedRequestsCount(sessionId);
  if (approvedCount >= session.capacity) {
    throw new ApiError(400, 'Session capacity reached');
  }

  const { data: requestRow, error: requestError } = await supabaseAdmin
    .from('live_join_requests')
    .select('*')
    .eq('id', requestId)
    .eq('session_id', sessionId)
    .single<LiveJoinRequestRow>();

  if (requestError || !requestRow) {
    throw new ApiError(404, 'Join request not found');
  }
  if (requestRow.status !== 'pending') {
    throw new ApiError(400, 'Join request is already resolved');
  }

  const viewerIdentity = `guest_${requestRow.id}`;
  const token = await generateLiveKitToken({
    userId: viewerIdentity,
    roomName: session.room_name,
    role: 'student',
  });

  const { data: updatedRow, error: updateError } = await supabaseAdmin
    .from('live_join_requests')
    .update({
      status: 'approved',
      token,
    })
    .eq('id', requestId)
    .eq('session_id', sessionId)
    .select('*')
    .single<LiveJoinRequestRow>();

  if (updateError || !updatedRow) {
    throw new ApiError(500, 'Failed to approve join request');
  }

  return {
    id: updatedRow.id,
    status: updatedRow.status,
  };
}

export async function rejectJoinRequestService(
  sessionId: string,
  requestId: string,
  teacherId: string
) {
  await ensureLiveSessionOrThrow(await ensureTeacherOwnsSession(sessionId, teacherId));

  const { data: requestRow, error: requestError } = await supabaseAdmin
    .from('live_join_requests')
    .select('id,status')
    .eq('id', requestId)
    .eq('session_id', sessionId)
    .single<{ id: string; status: LiveJoinRequestStatus }>();

  if (requestError || !requestRow) {
    throw new ApiError(404, 'Join request not found');
  }
  if (requestRow.status !== 'pending') {
    throw new ApiError(400, 'Join request is already resolved');
  }

  const { data: updatedRow, error: updateError } = await supabaseAdmin
    .from('live_join_requests')
    .update({
      status: 'rejected',
      token: null,
    })
    .eq('id', requestId)
    .eq('session_id', sessionId)
    .select('id,status')
    .single<{ id: string; status: LiveJoinRequestStatus }>();

  if (updateError || !updatedRow) {
    throw new ApiError(500, 'Failed to reject join request');
  }

  return updatedRow;
}

export async function endLiveSessionService(sessionId: string, teacherId: string) {
  const session = await ensureTeacherOwnsSession(sessionId, teacherId);
  if (session.status === 'ended') {
    return {
      sessionId: session.id,
      status: session.status,
      endedAt: session.ended_at,
    };
  }

  const { data, error } = await supabaseAdmin
    .from('live_sessions')
    .update({
      status: 'ended',
      ended_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
    .select('*')
    .single<LiveSessionRow>();

  if (error || !data) {
    throw new ApiError(500, 'Failed to end live session');
  }

  return {
    sessionId: data.id,
    status: data.status,
    endedAt: data.ended_at,
  };
}

export async function joinLiveSessionAsTeacherService(sessionId: string, teacherId: string) {
  const session = await ensureLiveSessionOrThrow(
    await ensureTeacherOwnsSession(sessionId, teacherId)
  );

  const token = await generateLiveKitToken({
    userId: teacherId,
    roomName: session.room_name,
    role: 'teacher',
  });

  return {
    roomName: session.room_name,
    token,
  };
}
