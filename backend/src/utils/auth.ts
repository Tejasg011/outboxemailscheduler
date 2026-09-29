import type { Request, Response, NextFunction } from 'express';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated?.() && req.user) return next();
  return res.status(401).json({ error: 'Authentication required' });
}

export function userId(req: Request): string {
  return (req.user as { id: string }).id;
}
