import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { getSessionToken } from '../lib/session';

export interface AuthenticatedRequest extends Request {
  user?: Awaited<ReturnType<typeof prisma.user.findUnique>>;
}

export async function authGuard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const token = getSessionToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Missing authorization token' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }

    const payload = jwt.verify(token, secret) as { userId: string };
    if (!payload.userId) {
      return res.status(401).json({ error: 'Invalid token payload' });
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }
    next(error);
  }
}
