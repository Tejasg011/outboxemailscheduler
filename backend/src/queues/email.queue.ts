import { Queue } from 'bullmq';
import { bullConnection } from '../config/redis.js';

export const emailQueue = new Queue('email-scheduler', {
  connection: bullConnection,
  defaultJobOptions: {
    removeOnComplete: { age: 7 * 24 * 3600, count: 10000 },
    removeOnFail: { age: 30 * 24 * 3600, count: 10000 },
    attempts: 5,
  },
});
