import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: { id: string };
}

export function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Missing token' });
  }

  try {
    const payload = jwt.verify(
      token,
      process.env.SUPABASE_JWT_SECRET!
    ) as any;

    req.user = { id: payload.sub };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
