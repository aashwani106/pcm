import { supabaseAdmin } from '../config/supabase';
import { generateLiveKitToken } from './livekit.service';
import { findProfileRoleById } from '../models/profile.model';
import { ApiError } from '../utils/ApiError';

export async function startClassService(params: {
  classId: string;
  userId: string;
}) {
  const { classId, userId } = params;

  // 1) Fetch class
  const { data: cls, error } = await supabaseAdmin
    .from('classes')
    .select('*')
    .eq('id', classId)
    .single();

  if (error || !cls) {
    throw new ApiError(404, 'Class not found');
  }

  // 2) Ownership check
  if (cls.teacher_id !== userId) {
    throw new ApiError(403, 'Not allowed to start this class');
  }

  // 3) Status check
  if (cls.status !== 'scheduled') {
    throw new ApiError(400, 'Class cannot be started');
  }

  // 4) Update status
  const { data: updated, error: updateError } = await supabaseAdmin
    .from('classes')
    .update({
      status: 'live',
      started_at: new Date().toISOString(),
    })
    .eq('id', classId)
    .select()
    .single();

  if (updateError || !updated) {
    throw new ApiError(500, 'Failed to start class');
  }

  return {
    id: updated.id,
    status: updated.status,
    started_at: updated.started_at,
    livekit_room_name: updated.livekit_room_name,
  };
}

type LiveKitJoinRole = 'teacher' | 'student' | 'admin';

export async function getClassStateService(params: {
  classId: string;
  userId: string;
}) {
  const { classId, userId } = params;

  const { data: cls, error } = await supabaseAdmin
    .from('classes')
    .select('*')
    .eq('id', classId)
    .single();

  if (error || !cls) {
    throw new ApiError(404, 'Class not found');
  }

  const { data: profile, error: profileError } = await findProfileRoleById(userId);
  if (profileError || !profile?.role) {
    throw new ApiError(403, 'Role not found');
  }

  if (profile.role === 'teacher') {
    if (cls.teacher_id !== userId) {
      throw new ApiError(403, 'Not allowed to access this class');
    }
  } else if (profile.role === 'student') {
    const { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (studentError || !student) {
      throw new ApiError(403, 'Not allowed to access this class');
    }

    const studentBatch = (student.batch_id ?? student.batch ?? null) as string | null;
    if (!studentBatch || studentBatch !== cls.batch_id) {
      throw new ApiError(403, 'Not allowed to access this class');
    }
  } else if (profile.role !== 'admin') {
    throw new ApiError(403, 'Invalid role');
  }

  return {
    id: cls.id,
    status: cls.status,
    teacher_id: cls.teacher_id,
    batch_id: cls.batch_id,
    livekit_room_name: cls.livekit_room_name,
    started_at: cls.started_at,
    ended_at: cls.ended_at,
  };
}

export async function joinClassService(params: {
  classId: string;
  userId: string;
}) {
  const { classId, userId } = params;

  // 1) Fetch class
  const { data: cls, error } = await supabaseAdmin
    .from('classes')
    .select('*')
    .eq('id', classId)
    .single();

  if (error || !cls) {
    throw new ApiError(404, 'Class not found');
  }

  // 2) Must be live
  if (cls.status !== 'live') {
    throw new ApiError(400, 'Class is not live');
  }

  // 3) Resolve role
  const { data: profile, error: profileError } = await findProfileRoleById(userId);
  if (profileError || !profile?.role) {
    throw new ApiError(403, 'Role not found');
  }

  let livekitRole: LiveKitJoinRole;

  // 4) Role-based checks
  if (profile.role === 'teacher') {
    if (cls.teacher_id !== userId) {
      throw new ApiError(403, 'Not your class');
    }
    livekitRole = 'teacher';
  } else if (profile.role === 'student') {
    const { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (studentError || !student) {
      throw new ApiError(403, 'Not allowed to join this class');
    }

    const studentBatch = (student.batch_id ?? student.batch ?? null) as string | null;
    if (!studentBatch || studentBatch !== cls.batch_id) {
      throw new ApiError(403, 'Not allowed to join this class');
    }

    livekitRole = 'student';
  } else if (profile.role === 'admin') {
    livekitRole = 'admin';
  } else {
    throw new ApiError(403, 'Invalid role');
  }

  // 5) Generate token
  const token = await generateLiveKitToken({
    userId,
    roomName: cls.livekit_room_name,
    role: livekitRole,
  });

  return {
    roomName: cls.livekit_room_name,
    token,
  };
}

export async function endClassService(params: {
  classId: string;
  userId: string;
}) {
  const { classId, userId } = params;

  // 1) Fetch class
  const { data: cls, error } = await supabaseAdmin
    .from('classes')
    .select('*')
    .eq('id', classId)
    .single();

  if (error || !cls) {
    throw new ApiError(404, 'Class not found');
  }

  // 2) Must be live
  if (cls.status !== 'live') {
    throw new ApiError(400, 'Class is not live');
  }

  // 3) Resolve role
  const { data: profile, error: profileError } = await findProfileRoleById(userId);
  if (profileError || !profile?.role) {
    throw new ApiError(403, 'Role not found');
  }

  // 4) Permission check
  const isTeacherOwner = profile.role === 'teacher' && cls.teacher_id === userId;
  const isAdmin = profile.role === 'admin';
  if (!isTeacherOwner && !isAdmin) {
    throw new ApiError(403, 'Not allowed to end this class');
  }

  // 5) Update state
  const { data: updated, error: updateError } = await supabaseAdmin
    .from('classes')
    .update({
      status: 'ended',
      ended_at: new Date().toISOString(),
    })
    .eq('id', classId)
    .select()
    .single();

  if (updateError || !updated) {
    throw new ApiError(500, 'Failed to end class');
  }

  return {
    id: updated.id,
    status: updated.status,
    ended_at: updated.ended_at,
  };
}
