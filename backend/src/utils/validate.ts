import { z } from 'zod';

export const scheduleSchema = z.object({
  subject: z.string().min(1).max(300),
  body: z.string().min(1),
  startTime: z.string().datetime(),
  delayMs: z.number().int().min(0).max(86_400_000).optional(),
  hourlyLimit: z.number().int().min(1).max(100_000).optional(),
  recipients: z.array(z.string().email()).min(1),
  senderId: z.string().uuid().optional(),
});
