import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string().default('postgresql://reachinbox:reachinbox@localhost:5432/reachinbox'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  ELASTICSEARCH_URL: z.string().default('http://localhost:9200'),
  SESSION_SECRET: z.string().default('change-this-secret'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().default('http://localhost:4000/api/auth/google/callback'),
  ETHEREAL_HOST: z.string().default('smtp.ethereal.email'),
  ETHEREAL_PORT: z.coerce.number().default(587),
  ETHEREAL_USER: z.string().optional(),
  ETHEREAL_PASS: z.string().optional(),
  DEFAULT_SENDER_EMAIL: z.string().default('scheduler@example.test'),
  MAX_EMAILS_PER_HOUR: z.coerce.number().default(200),
  MIN_DELAY_MS: z.coerce.number().default(2000),
  WORKER_CONCURRENCY: z.coerce.number().default(5),
  SLACK_CLIENT_ID: z.string().optional(),
  SLACK_CLIENT_SECRET: z.string().optional(),
  SLACK_REDIRECT_URI: z.string().default('http://localhost:4000/api/slack/callback'),
  SLACK_SCOPES: z.string().default('chat:write'),
  DEV_AUTH_BYPASS: z.coerce.boolean().default(false),
});

export const env = schema.parse(process.env);
