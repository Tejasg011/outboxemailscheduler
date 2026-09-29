import { env } from '../config/env.js';
import { query } from '../config/db.js';

export function slackConfigured() {
  return Boolean(env.SLACK_CLIENT_ID && env.SLACK_CLIENT_SECRET);
}

export function slackAuthorizeUrl(state: string) {
  if (!slackConfigured()) throw new Error('Slack OAuth is not configured');
  const params = new URLSearchParams({
    client_id: env.SLACK_CLIENT_ID!,
    scope: env.SLACK_SCOPES,
    redirect_uri: env.SLACK_REDIRECT_URI,
    state,
  });
  return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
}

export async function exchangeSlackCode(code: string) {
  const response = await fetch('https://slack.com/api/oauth.v2.access', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: env.SLACK_CLIENT_ID!, client_secret: env.SLACK_CLIENT_SECRET!, code, redirect_uri: env.SLACK_REDIRECT_URI }),
  });
  const data: any = await response.json();
  if (!data.ok || !data.access_token) throw new Error(data.error || 'Slack OAuth failed');
  return data;
}

export async function notifySlack(userId: string, message: string) {
  const result = await query<{ bot_token: string }>('SELECT bot_token FROM slack_connections WHERE user_id=$1', [userId]);
  const token = result.rows[0]?.bot_token;
  if (!token) return false;
  const response = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel: 'general', text: message }),
  });
  const data: any = await response.json();
  if (!data.ok) throw new Error(data.error || 'Slack notification failed');
  return true;
}
