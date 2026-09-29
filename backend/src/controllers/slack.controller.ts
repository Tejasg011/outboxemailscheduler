import type { Request, Response } from 'express';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { query } from '../config/db.js';
import { exchangeSlackCode, slackAuthorizeUrl } from '../services/slack.service.js';
import { userId } from '../utils/auth.js';

export function connectSlack(req: Request, res: Response) {
  if (!env.SLACK_CLIENT_ID || !env.SLACK_CLIENT_SECRET) return res.status(503).json({ error: 'Slack OAuth is not configured' });
  const state = crypto.randomBytes(24).toString('hex');
  req.session.slackState = state;
  res.json({ url: slackAuthorizeUrl(state) });
}

export async function slackCallback(req: Request, res: Response) {
  const state = String(req.query.state ?? '');
  const code = String(req.query.code ?? '');
  if (!state || state !== req.session.slackState || !code) return res.status(400).send('Invalid Slack OAuth state');
  try {
    const data = await exchangeSlackCode(code);
    await query(
      `INSERT INTO slack_connections (user_id, team_id, team_name, bot_token)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (user_id) DO UPDATE SET team_id=EXCLUDED.team_id, team_name=EXCLUDED.team_name, bot_token=EXCLUDED.bot_token, updated_at=NOW()`,
      [userId(req), data.team?.id ?? null, data.team?.name ?? null, data.access_token],
    );
    delete req.session.slackState;
    res.redirect(`${env.FRONTEND_URL}/dashboard?slack=connected`);
  } catch (error) {
    res.status(400).send(error instanceof Error ? error.message : 'Slack connection failed');
  }
}

export async function slackStatus(req: Request, res: Response) {
  const result = await query<any>('SELECT team_name, created_at, updated_at FROM slack_connections WHERE user_id=$1', [userId(req)]);
  res.json({ connected: Boolean(result.rows[0]), connection: result.rows[0] ?? null });
}

export async function disconnectSlack(req: Request, res: Response) {
  await query('DELETE FROM slack_connections WHERE user_id=$1', [userId(req)]);
  res.json({ connected: false });
}
