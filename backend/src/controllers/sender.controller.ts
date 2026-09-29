import type { Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../config/db.js';
import { userId } from '../utils/auth.js';

const schema = z.object({ name: z.string().min(1), email: z.string().email(), smtpHost: z.string().min(1), smtpPort: z.number().int().min(1).max(65535), smtpUser: z.string().min(1), smtpPass: z.string().min(1) });

export async function listSenders(req: Request, res: Response) {
  const result = await query<any>('SELECT id,name,email, smtp_host, smtp_port, active, created_at FROM senders WHERE user_id=$1 ORDER BY created_at DESC', [userId(req)]);
  res.json({ senders: result.rows });
}

export async function createSender(req: Request, res: Response) {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const s = parsed.data;
  const result = await query<any>(`INSERT INTO senders (user_id,name,email,smtp_host,smtp_port,smtp_user,smtp_pass) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id,name,email,smtp_host,smtp_port,active,created_at`, [userId(req), s.name, s.email, s.smtpHost, s.smtpPort, s.smtpUser, s.smtpPass]);
  res.status(201).json({ sender: result.rows[0] });
}

export async function deactivateSender(req: Request, res: Response) {
  const result = await query<any>('UPDATE senders SET active=FALSE WHERE id=$1 AND user_id=$2 RETURNING id', [req.params.id, userId(req)]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Sender not found' });
  res.json({ ok: true });
}
