import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret';

export interface AuthRequest extends Request {
  user?: { id: number; role: string; email: string };
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    res.status(401).json({ error: 'No token' });
    return;
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: number; role: string; email: string };
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireManager(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'manager') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  next();
}
