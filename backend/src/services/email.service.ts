import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

export async function sendEmail(sender: {
  email: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
}, recipient: string, subject: string, body: string, idempotencyKey?: string) {
  const transport = nodemailer.createTransport({
    host: sender.smtp_host,
    port: sender.smtp_port,
    secure: sender.smtp_port === 465,
    auth: { user: sender.smtp_user, pass: sender.smtp_pass },
  });
  return transport.sendMail({
    from: sender.email,
    to: recipient,
    subject,
    text: body,
    headers: idempotencyKey ? { 'X-Email-Idempotency-Key': idempotencyKey } : undefined,
  });
}

export function defaultSender() {
  if (!env.ETHEREAL_USER || !env.ETHEREAL_PASS) {
    throw new Error('Ethereal SMTP credentials are not configured');
  }
  return {
    email: env.DEFAULT_SENDER_EMAIL,
    smtp_host: env.ETHEREAL_HOST,
    smtp_port: env.ETHEREAL_PORT,
    smtp_user: env.ETHEREAL_USER,
    smtp_pass: env.ETHEREAL_PASS,
  };
}
