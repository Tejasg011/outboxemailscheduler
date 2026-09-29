import type { Request, Response } from 'express';
import { parse } from 'url';
import { query } from '../config/db.js';
import { emailQueue } from '../queues/email.queue.js';
import { indexEmail, searchEmails } from '../services/search.service.js';
import { scheduleSchema } from '../utils/validate.js';
import { userId } from '../utils/auth.js';
import { env } from '../config/env.js';

function makeIdempotencyKey(userId: string, recipient: string, subject: string, scheduledAt: string) {
  return `${userId}:${recipient.toLowerCase()}:${Buffer.from(subject).toString('base64url')}:${scheduledAt}`;
}

export async function scheduleEmails(req: Request, res: Response) {
  const parsed = scheduleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const input = parsed.data;
  const uid = userId(req);
  const start = new Date(input.startTime).getTime();
  const delay = input.delayMs ?? env.MIN_DELAY_MS;
  const jobs = [];
  for (let i = 0; i < input.recipients.length; i++) {
    const recipient = input.recipients[i];
    const scheduledAt = new Date(start + i * delay);
    const idempotencyKey = makeIdempotencyKey(uid, recipient, input.subject, scheduledAt.toISOString());
    const insert = await query<any>(
      `INSERT INTO email_jobs (user_id, sender_id, recipient, subject, body, scheduled_at, idempotency_key)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (idempotency_key) DO NOTHING RETURNING *`,
      [uid, input.senderId ?? null, recipient, input.subject, input.body, scheduledAt, idempotencyKey],
    );
    if (!insert.rows[0]) continue;
    const row = insert.rows[0];
    const job = await emailQueue.add('send-email', { emailJobId: row.id, hourlyLimit: input.hourlyLimit, delayMs: delay }, {
      jobId: row.id,
      delay: Math.max(0, scheduledAt.getTime() - Date.now()),
    });
    await query(`UPDATE email_jobs SET bull_job_id=$1 WHERE id=$2`, [job.id, row.id]);
    await indexEmail(row);
    jobs.push({ id: row.id, recipient, scheduledAt });
  }
  return res.status(201).json({ count: jobs.length, jobs });
}

export async function listEmails(req: Request, res: Response) {
  const uid = userId(req);
  const status = req.query.status as string | undefined;
  const limit = Math.min(Number(req.query.limit ?? 100), 500);
  const params: unknown[] = [uid];
  let where = 'WHERE user_id=$1';
  if (status) { params.push(status); where += ` AND status=$${params.length}`; }
  params.push(limit);
  const result = await query<any>(`SELECT * FROM email_jobs ${where} ORDER BY scheduled_at DESC LIMIT $${params.length}`, params);
  return res.json({ emails: result.rows });
}

export async function cancelEmail(req: Request, res: Response) {
  const uid = userId(req);
  const result = await query<any>(`UPDATE email_jobs SET status='cancelled', updated_at=NOW() WHERE id=$1 AND user_id=$2 AND status='scheduled' RETURNING *`, [req.params.id, uid]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Scheduled email not found or already processed' });
  const job = result.rows[0].bull_job_id ? await emailQueue.getJob(result.rows[0].bull_job_id) : null;
  if (job) await job.remove().catch(() => undefined);
  await indexEmail(result.rows[0]);
  return res.json({ email: result.rows[0] });
}

export async function search(req: Request, res: Response) {
  const q = String(req.query.q ?? '').trim();
  if (!q) return res.json({ emails: [] });
  return res.json({ emails: await searchEmails(userId(req), q) });
}
