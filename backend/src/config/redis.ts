import { Redis } from 'ioredis';
import { env } from './env.js';

export const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
export const bullConnection = { url: env.REDIS_URL };
