import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import session from 'express-session';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import passport from './config/passport.js';
import { env } from './config/env.js';
import { emailQueue } from './queues/email.queue.js';
import authRoutes from './routes/auth.routes.js';
import emailRoutes from './routes/email.routes.js';
import slackRoutes from './routes/slack.routes.js';
import senderRoutes from './routes/sender.routes.js';
import healthRoutes from './routes/health.routes.js';
import { ensureEmailIndex } from './services/search.service.js';
import { query } from './config/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(session({ secret: env.SESSION_SECRET, resave: false, saveUninitialized: false, cookie: { httpOnly: true, sameSite: 'lax', secure: env.NODE_ENV === 'production', maxAge: 7 * 24 * 60 * 60 * 1000 } }));
app.use(passport.initialize());
app.use(passport.session());

app.get('/api', (_req, res) => res.json({ name: 'Outbox Email Scheduler API', status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/slack', slackRoutes);
app.use('/api/senders', senderRoutes);
app.use('/api/health', healthRoutes);

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');
createBullBoard({ queues: [new BullMQAdapter(emailQueue)], serverAdapter });
app.use('/admin/queues', serverAdapter.getRouter());

app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  res.status(500).json({ error: error?.message ?? 'Internal server error' });
});

async function bootstrap() {
  const __filename = fileURLToPath(import.meta.url);
  const schemaPath = path.resolve(path.dirname(__filename), 'db.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  await query(schema);
  await ensureEmailIndex().catch((error) => console.error('Elasticsearch initialization failed:', error.message));
  app.listen(env.PORT, () => console.log(`Backend running on http://localhost:${env.PORT}`));
}

bootstrap().catch((error) => { console.error(error); process.exit(1); });
