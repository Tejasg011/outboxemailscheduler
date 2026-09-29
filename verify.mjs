import fs from 'node:fs';
import path from 'node:path';

const root = new URL('.', import.meta.url).pathname;
const required = [
  'backend/src/server.ts', 'backend/src/worker.ts', 'backend/src/workers/email.worker.ts',
  'backend/src/queues/email.queue.ts', 'backend/src/services/rate-limit.service.ts',
  'backend/src/services/search.service.ts', 'backend/src/services/slack.service.ts',
  'backend/src/db.sql', 'frontend/src/main.tsx', 'frontend/src/pages/Dashboard.tsx',
  'frontend/src/components/ComposeModal.tsx', 'docker-compose.yml', 'README.md'
];
const missing = required.filter((file) => !fs.existsSync(path.join(root, file)));
if (missing.length) throw new Error(`Missing required files: ${missing.join(', ')}`);
const allSource = required.filter(f => f.endsWith('.ts') || f.endsWith('.tsx')).map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');
if (/node-cron|agenda|crontab|cron\.schedule/i.test(allSource)) throw new Error('Forbidden cron scheduler reference detected in source');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'backend/package.json')));
for (const dep of ['express','bullmq','pg','nodemailer','passport','passport-google-oauth20','ioredis','@elastic/elasticsearch']) if (!pkg.dependencies[dep]) throw new Error(`Missing dependency ${dep}`);
const compose = fs.readFileSync(path.join(root, 'docker-compose.yml'), 'utf8');
for (const service of ['postgres:','redis:','elasticsearch:']) if (!compose.includes(service)) throw new Error(`Docker service missing: ${service}`);
const schema = fs.readFileSync(path.join(root, 'backend/src/db.sql'), 'utf8');
for (const token of ['email_jobs','idempotency_key','slack_connections','senders']) if (!schema.includes(token)) throw new Error(`Schema token missing: ${token}`);
console.log('Assignment structure verification passed.');
console.log(`Checked ${required.length} required files, cron prohibition, dependencies, infrastructure and schema.`);

function simulateSchedule(count, startMs, delayMs, hourlyLimit) {
  const result = [];
  let last = startMs - 1;
  let window = Math.floor(startMs / 3600000);
  let used = 0;
  for (let i = 0; i < count; i++) {
    let at = Math.max(startMs + i * delayMs, last);
    let currentWindow = Math.floor(at / 3600000);
    if (currentWindow !== window) { window = currentWindow; used = 0; }
    if (used >= hourlyLimit) {
      window += 1; used = 0;
      at = window * 3600000;
    }
    result.push(at); used++; last = at;
  }
  return result;
}
const simulated = simulateSchedule(25, Date.now(), 2000, 10);
if (simulated.length !== 25 || simulated.some((v, i) => i && v < simulated[i - 1])) throw new Error('Scheduling simulation is not ordered');
if (simulated.filter(v => Math.floor(v / 3600000) === Math.floor(simulated[0] / 3600000)).length > 10) throw new Error('Hourly limit simulation failed');
console.log('Scheduling/rate-limit simulation passed.');
