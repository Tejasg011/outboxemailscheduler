import type { Request, Response } from 'express';
import { query } from '../config/db.js';
import { redis } from '../config/redis.js';
import { elastic } from '../config/elasticsearch.js';

export async function health(_req: Request, res: Response) {
  const checks: Record<string, string> = {};
  try { await query('SELECT 1'); checks.database = 'ok'; } catch { checks.database = 'error'; }
  try { await redis.ping(); checks.redis = 'ok'; } catch { checks.redis = 'error'; }
  try { await elastic.ping(); checks.elasticsearch = 'ok'; } catch { checks.elasticsearch = 'error'; }
  const ok = Object.values(checks).every((x) => x === 'ok');
  res.status(ok ? 200 : 503).json({ ok, checks });
}
