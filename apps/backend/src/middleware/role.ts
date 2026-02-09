import { Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { AuthRequest } from './auth';

export async function requireStudent(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const userId = req.user!.id;

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (error || data.role !== 'student') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  next();
}
