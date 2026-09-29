import type { Request, Response } from 'express';
import passport from '../config/passport.js';
import { env } from '../config/env.js';
import { query } from '../config/db.js';

export function googleLogin(req: Request, res: Response) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(503).json({ error: 'Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.' });
  }
  return passport.authenticate('google', { scope: ['profile', 'email'] })(req, res);
}

export function googleCallback(req: Request, res: Response) {
  return passport.authenticate('google', { failureRedirect: `${env.FRONTEND_URL}/login?error=google` })(req, res, () => {
    res.redirect(`${env.FRONTEND_URL}/dashboard`);
  });
}

export function me(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ authenticated: false });
  return res.json({ authenticated: true, user: req.user });
}

export function logout(req: Request, res: Response) {
  req.logout((error) => {
    if (error) return res.status(500).json({ error: 'Logout failed' });
    req.session.destroy(() => res.json({ ok: true }));
  });
}

export async function devLogin(req: Request, res: Response) {
  if (!env.DEV_AUTH_BYPASS) {
    return res.status(403).json({ error: 'Dev login is disabled' });
  }
  try {
    const result = await query<{ id: string; name: string; email: string; avatar_url: string | null }>(
      `INSERT INTO users (google_id, name, email, avatar_url)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (google_id) DO UPDATE SET name=EXCLUDED.name, email=EXCLUDED.email, avatar_url=EXCLUDED.avatar_url
       RETURNING id, name, email, avatar_url`,
      ['dev-user-001', 'Dev User', 'dev@outbox.test', null],
    );
    const user = result.rows[0];
    req.login(user, (err) => {
      if (err) return res.status(500).json({ error: 'Login failed' });
      return res.json({ authenticated: true, user });
    });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message ?? 'Dev login failed' });
  }
}

