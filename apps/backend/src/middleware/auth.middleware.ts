import { NextFunction, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { ApiError } from '../utils/ApiError';

export interface AuthenticatedRequest extends Request {
  user?: { id: string };
}

function extractBearerToken(authorizationHeader: string | undefined) {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
}

export async function requireAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) {
  try {
    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      throw new ApiError(401, 'Missing or invalid token');
    }

    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) {
      throw new ApiError(401, 'Invalid token');
    }

    req.user = { id: data.user.id };
    next();
  } catch (error) {
    next(error);
  }
}
