import { redis } from '../config/redis.js';
import { env } from '../config/env.js';

const ACQUIRE_SCRIPT = `
local countKey = KEYS[1]
local lastKey = KEYS[2]
local limit = tonumber(ARGV[1])
local now = tonumber(ARGV[2])
local minDelay = tonumber(ARGV[3])
local ttl = tonumber(ARGV[4])
local count = tonumber(redis.call('GET', countKey) or '0')
local last = tonumber(redis.call('GET', lastKey) or '0')
if count >= limit then
  return {0, 2, ttl}
end
if last > 0 and (now - last) < minDelay then
  return {0, 1, minDelay - (now - last)}
end
redis.call('INCR', countKey)
redis.call('EXPIRE', countKey, ttl)
redis.call('SET', lastKey, now, 'EX', ttl)
return {1, 0, 0}
`;

export async function acquireSendSlot(senderId: string, limit: number, minDelayMs: number) {
  const now = Date.now();
  const hourStart = Math.floor(now / 3_600_000) * 3_600_000;
  const ttl = Math.max(60, Math.ceil((hourStart + 3_600_000 - now) / 1000));
  const window = Math.floor(now / 3_600_000);
  const countKey = `email-rate:${senderId}:${window}`;
  const lastKey = `email-last:${senderId}`;
  const result = await redis.eval(ACQUIRE_SCRIPT, 2, countKey, lastKey, String(limit), String(now), String(minDelayMs), String(ttl)) as [number, number, number];
  return { allowed: result[0] === 1, reason: result[1] === 0 ? 'ok' : result[1] === 1 ? 'delay' : 'hourly_limit', waitMs: result[2] || 0, nextHourAt: hourStart + 3_600_000 };
}

export function configuredLimit(value?: number) {
  return value && value > 0 ? value : env.MAX_EMAILS_PER_HOUR;
}
