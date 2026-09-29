import { Worker } from 'bullmq';
import { bullConnection } from '../config/redis.js';
import { env } from '../config/env.js';
import { query } from '../config/db.js';
import { emailQueue } from '../queues/email.queue.js';
import { sendEmail, defaultSender } from '../services/email.service.js';
import { acquireSendSlot, configuredLimit } from '../services/rate-limit.service.js';
import { indexEmail } from '../services/search.service.js';
import { notifySlack } from '../services/slack.service.js';

export const worker = new Worker('email-scheduler', async (job, token) => {
  const emailJobId = job.data.emailJobId as string;
  const result = await query<any>(
    `SELECT ej.*, s.email AS sender_email, s.smtp_host, s.smtp_port, s.smtp_user, s.smtp_pass
     FROM email_jobs ej LEFT JOIN senders s ON s.id=ej.sender_id WHERE ej.id=$1`,
    [emailJobId],
  );
  const email = result.rows[0];
  if (!email) return { skipped: true, reason: 'missing_email_job' };
  if (email.status === 'sent' || email.status === 'cancelled') return { skipped: true, reason: email.status };

  const senderId = email.sender_id ?? 'default';
  const limit = configuredLimit(job.data.hourlyLimit);
  const minDelay = job.data.delayMs ?? env.MIN_DELAY_MS;
  const slot = await acquireSendSlot(senderId, limit, minDelay);

  if (!slot.allowed) {
    const wait = slot.reason === 'hourly_limit' ? Math.max(1000, slot.nextHourAt - Date.now()) : Math.max(100, slot.waitMs);
    await query(`UPDATE email_jobs SET scheduled_at=NOW() + ($1 * INTERVAL '1 millisecond'), updated_at=NOW() WHERE id=$2`, [wait, emailJobId]);
    if (slot.reason === 'hourly_limit') {
      await notifySlack(email.user_id, `Hourly email limit reached for sender ${email.sender_email ?? env.DEFAULT_SENDER_EMAIL}. Jobs are being moved to the next available hour.`).catch(() => false);
    }
    if (token) await job.moveToDelayed(Date.now() + wait, token);
    return { rescheduled: true, reason: slot.reason, waitMs: wait };
  }

  await query(`UPDATE email_jobs SET status='processing', attempts=attempts+1, updated_at=NOW() WHERE id=$1 AND status <> 'sent'`, [emailJobId]);
  const sender = email.sender_id ? {
    email: email.sender_email,
    smtp_host: email.smtp_host,
    smtp_port: email.smtp_port,
    smtp_user: email.smtp_user,
    smtp_pass: email.smtp_pass,
  } : defaultSender();

  try {
    const info = await sendEmail(sender, email.recipient, email.subject, email.body, email.idempotency_key);
    const updated = await query<any>(
      `UPDATE email_jobs SET status='sent', sent_at=NOW(), error_message=NULL, updated_at=NOW() WHERE id=$1 RETURNING *`,
      [emailJobId],
    );
    await indexEmail(updated.rows[0]);
    return { messageId: info.messageId };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const updated = await query<any>(
      `UPDATE email_jobs SET status='failed', error_message=$1, updated_at=NOW() WHERE id=$2 RETURNING *`,
      [message, emailJobId],
    );
    await indexEmail(updated.rows[0]);
    throw error;
  }
}, { connection: bullConnection, concurrency: env.WORKER_CONCURRENCY });

worker.on('failed', (job, error) => {
  if (job) console.error(`Email job ${job.id} failed: ${error.message}`);
});

export async function closeWorker() { await worker.close(); await emailQueue.close(); }
