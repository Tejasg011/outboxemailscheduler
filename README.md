# Outbox Email Scheduler

A full-stack email job scheduling service built with TypeScript. It accepts email send requests via a REST API, schedules them using BullMQ delayed jobs (no cron), sends through Ethereal SMTP, and survives server restarts without losing or duplicating jobs. Includes a React dashboard for composing, monitoring, and searching email jobs.

Built as a hiring assignment for Outbox Labs.

---

## Features

### Backend
- **Delayed Job Scheduling** — Every email is a BullMQ delayed job in Redis. No cron, no polling loops. Jobs fire exactly when their delay expires.
- **Durable Persistence** — PostgreSQL stores every email job with an idempotency key. Duplicate scheduling is impossible. Restart-safe by design.
- **Redis Rate Limiting** — Atomic Lua script enforces per-sender hourly caps and minimum delay between sends. Over-limit jobs are rescheduled to the next available hour, never dropped.
- **Configurable Worker** — Concurrency, minimum send gap, and hourly limits are all controlled via environment variables.
- **Slack Notifications** — Real OAuth flow. Live Slack message the moment a sender hits its hourly limit.
- **Ethereal SMTP** — Sends through Ethereal (fake SMTP) so no real emails are delivered during testing. Preview URLs stored per email.
- **Elasticsearch Search** — Full-text search across recipient, subject, and body. Falls back to PostgreSQL if ES is unavailable.
- **Bull Board Dashboard** — Live queue visibility at `/admin/queues`.
- **Google OAuth Login** — Session-based auth via Passport.js. Dev bypass mode available for local testing.
- **Multiple Senders** — Each user can configure separate sender identities with their own SMTP credentials and independent rate-limit buckets.

### Frontend
- Google sign-in or one-click dev login (bypass mode)
- **Compose flow** — Subject, body, recipient list (paste or file upload), start time, per-email delay, and hourly cap
- **Scheduled / Sent tabs** with refresh and loading states
- **Full-text search** across recipient, subject, and body
- **Cancel** scheduled emails before they send
- **Slack connect/disconnect** with live connection state
- Link to the Bull Board queue dashboard

---

## Tech Stack

| Layer         | Technology                                                       |
|---------------|------------------------------------------------------------------|
| **Backend**   | Node.js, TypeScript, Express, BullMQ, IORedis, pg (raw SQL)     |
| **Database**  | PostgreSQL 16 (Docker)                                           |
| **Queue**     | Redis 7 + BullMQ delayed jobs                                    |
| **Search**    | Elasticsearch 8.15 (with PostgreSQL `ILIKE` fallback)            |
| **Mail**      | Nodemailer via Ethereal (fake SMTP)                              |
| **Frontend**  | React 18, TypeScript, Vite, Tailwind CSS, Lucide React icons     |
| **Auth**      | Passport.js + Google OAuth 2.0 (with dev bypass mode)            |
| **Notify**    | Slack Web API (OAuth flow)                                       |
| **Infra**     | Docker Compose (Postgres, Redis, Elasticsearch)                  |
| **Validation**| Zod (backend request validation and env parsing)                 |
| **Monorepo**  | npm workspaces (`backend/` + `frontend/`)                        |

---

## Architecture

```
React + Tailwind (Vite)  →  http://localhost:5173
       │
       ▼
Express REST API  ──── PostgreSQL (durable email/job state)
       │
       ├── Redis / BullMQ ──── Worker ──── Ethereal SMTP
       │         │
       │         └── delayed jobs + concurrency + rate limiting (Lua)
       │
       ├── Elasticsearch (full-text search index)
       │
       ├── Slack OAuth / notifications
       │
       └── Bull Board (/admin/queues)
```

---

## Prerequisites

- **Node.js 20+** and **npm**
- **Docker Desktop** (for PostgreSQL, Redis, and Elasticsearch)
- **Git** (optional, for cloning)

---

## Step-by-Step Setup Guide

### Step 1 — Clone or open the project

```bash
cd path/to/outbox-email-scheduler
```

### Step 2 — Start Docker Desktop

Open Docker Desktop from your Start menu and wait for it to fully initialize (the whale icon in your system tray should stop animating).

### Step 3 — Start infrastructure services

```bash
docker compose up -d
```

This starts three containers:
- **PostgreSQL** on port `5432`
- **Redis** on port `6379`
- **Elasticsearch** on port `9200`

Verify they're running:

```bash
docker ps
```

### Step 4 — Create environment files

**Backend** — create `backend/.env`:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and configure:

```env
NODE_ENV=development
PORT=4000
FRONTEND_URL=http://localhost:5173
DATABASE_URL=postgresql://reachinbox:reachinbox@localhost:5432/reachinbox_scheduler
REDIS_URL=redis://localhost:6379
ELASTICSEARCH_URL=http://localhost:9200
SESSION_SECRET=your-secret-here

# Leave blank to use dev bypass login (no Google OAuth needed)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Leave blank for auto-created Ethereal account
ETHEREAL_USER=
ETHEREAL_PASS=

# Scheduler settings
MAX_EMAILS_PER_HOUR=200
MIN_DELAY_MS=2000
WORKER_CONCURRENCY=5

# Enable dev login (one-click, no Google OAuth)
DEV_AUTH_BYPASS=true
```

**Frontend** — create `frontend/.env`:

```bash
cp frontend/.env.example frontend/.env
```

Add:

```env
VITE_API_URL=http://localhost:4000/api
VITE_DEV_BYPASS=true
```

### Step 5 — Create the database

If this is a fresh setup, create the application database:

```bash
docker exec <postgres-container-name> psql -U reachinbox -c "CREATE DATABASE reachinbox_scheduler;"
```

> Replace `<postgres-container-name>` with the actual container name shown by `docker ps` (e.g., `reachinbox-email-scheduler-postgres-1`).

### Step 6 — Install dependencies

From the project root (monorepo):

```bash
npm install
```

This installs dependencies for both `backend/` and `frontend/` workspaces.

### Step 7 — Start the backend API

```bash
npm run dev:backend
```

You should see:

```
Backend running on http://localhost:4000
```

### Step 8 — Start the email worker

Open a **second terminal**:

```bash
npm run worker --workspace backend
```

You should see:

```
Email worker started
```

### Step 9 — Start the frontend

Open a **third terminal**:

```bash
npm run dev:frontend
```

You should see:

```
VITE v5.x.x  ready in xxxms
  ➜  Local:   http://localhost:5173/
```

### Step 10 — Open the app

1. Open **http://localhost:5173** in your browser.
2. Click **"Dev Login (bypass)"** to sign in without Google OAuth.
3. You're on the dashboard — compose emails, schedule them, and watch them process!

---

## Running Services Summary

| Service            | URL                                    | Terminal |
|--------------------|----------------------------------------|----------|
| Frontend (Vite)    | http://localhost:5173                   | 3        |
| Backend API        | http://localhost:4000                   | 1        |
| Email Worker       | (background process)                   | 2        |
| Queue Dashboard    | http://localhost:4000/admin/queues      | —        |
| Health Check       | http://localhost:4000/api/health        | —        |
| PostgreSQL         | localhost:5432                          | Docker   |
| Redis              | localhost:6379                          | Docker   |
| Elasticsearch      | localhost:9200                          | Docker   |

---

## Configuration Reference

### Backend (`backend/.env`)

| Variable               | Default                          | Purpose                                           |
|------------------------|----------------------------------|----------------------------------------------------|
| `PORT`                 | `4000`                           | API listen port                                    |
| `DATABASE_URL`         | (see `.env.example`)             | PostgreSQL connection string                       |
| `REDIS_URL`            | `redis://localhost:6379`         | BullMQ + rate-limit counters                       |
| `ELASTICSEARCH_URL`    | `http://localhost:9200`          | Email search index (optional)                      |
| `SESSION_SECRET`       | —                                | Express session signing secret                     |
| `GOOGLE_CLIENT_ID`     | —                                | Google OAuth client ID                             |
| `GOOGLE_CLIENT_SECRET` | —                                | Google OAuth client secret                         |
| `FRONTEND_URL`         | `http://localhost:5173`          | CORS origin                                        |
| `WORKER_CONCURRENCY`   | `5`                              | Parallel email sends per worker                    |
| `MIN_DELAY_MS`         | `2000`                           | Minimum gap between sends (ms)                     |
| `MAX_EMAILS_PER_HOUR`  | `200`                            | Per-sender hourly cap                              |
| `ETHEREAL_USER/PASS`   | (blank = auto-create)            | Ethereal SMTP credentials                          |
| `SLACK_CLIENT_ID`      | —                                | Slack app client ID                                |
| `SLACK_CLIENT_SECRET`  | —                                | Slack app client secret                            |
| `DEV_AUTH_BYPASS`       | `false`                          | Enable `POST /api/auth/dev-login` for demos        |

### Frontend (`frontend/.env`)

| Variable             | Purpose                                  |
|----------------------|------------------------------------------|
| `VITE_API_URL`       | Backend base URL (`http://localhost:4000/api`) |
| `VITE_DEV_BYPASS`    | Show the dev-login button (`true`)       |

---

## API Endpoints

All `/api/*` routes except auth and Slack callback require an authenticated session.

| Method | Path                        | Description                                                |
|--------|-----------------------------|------------------------------------------------------------|
| GET    | `/api`                      | API status check                                           |
| GET    | `/api/auth/google`          | Initiate Google OAuth login                                |
| GET    | `/api/auth/google/callback` | Google OAuth callback                                      |
| POST   | `/api/auth/dev-login`       | Dev bypass login (only with `DEV_AUTH_BYPASS=true`)         |
| GET    | `/api/auth/me`              | Current authenticated user                                 |
| POST   | `/api/auth/logout`          | Logout                                                     |
| POST   | `/api/emails/schedule`      | Schedule emails (one delayed job per recipient)             |
| GET    | `/api/emails?status=`       | List emails (`scheduled`, `sent`, `failed`, `cancelled`)   |
| GET    | `/api/emails/search?q=`     | Full-text search across recipient, subject, body            |
| POST   | `/api/emails/:id/cancel`    | Cancel a scheduled email before it sends                   |
| POST   | `/api/emails/parse-leads`   | Upload CSV/TXT file, extract email addresses               |
| GET    | `/api/senders`              | List sender identities                                     |
| POST   | `/api/senders`              | Create a new sender identity                               |
| GET    | `/api/slack/connect`        | Get Slack OAuth authorize URL                              |
| GET    | `/api/slack/callback`       | Slack OAuth redirect target                                |
| GET    | `/api/slack/status`         | Slack connection state                                     |
| POST   | `/api/slack/disconnect`     | Remove Slack integration                                   |
| GET    | `/api/health`               | Liveness probe                                             |
| GET    | `/admin/queues`             | Bull Board UI                                              |

### Example scheduling request

```json
POST /api/emails/schedule

{
  "subject": "Hello from Outbox",
  "body": "This is a scheduled test email.",
  "startTime": "2026-10-01T10:00:00.000Z",
  "delayMs": 2000,
  "hourlyLimit": 200,
  "recipients": ["person1@example.com", "person2@example.com"]
}
```

---

## How It Works

### Scheduling
`POST /api/emails/schedule` writes one `email_jobs` row per recipient into PostgreSQL, then enqueues one BullMQ delayed job per row with `delay = scheduledAt - now`, staggered by the requested per-email gap. The worker picks up each job when its delay expires.

### Rate Limiting
A Redis Lua script atomically checks per-sender hourly counts and minimum-send delay before allowing a send. When the limit is reached, the job is rescheduled to the next available hour (not dropped), and a Slack notification is sent.

### Persistence & Idempotency
Delayed jobs live in Redis and survive API restarts. PostgreSQL is the source of truth. Each email has a unique `idempotency_key` derived from (user, recipient, subject, scheduledAt), making duplicate scheduling impossible. The worker skips rows already marked `sent`.

### Search
Every email create/update is indexed into Elasticsearch. The search endpoint queries ES first and falls back to PostgreSQL `ILIKE` if ES is unavailable.

---

## Setting Up Integrations (Optional)

### Google OAuth
1. Google Cloud Console → OAuth consent screen (External) → add your Gmail as a Test user.
2. Credentials → OAuth client ID (Web application) → Authorized callback URL: `http://localhost:4000/api/auth/google/callback`.
3. Put the client ID + secret in `backend/.env`, set `DEV_AUTH_BYPASS=false`, and restart.

### Slack
1. api.slack.com → Create App → OAuth & Permissions → Redirect URL: `http://localhost:4000/api/slack/callback`.
2. Bot scopes: `chat:write`.
3. Put client ID + secret in `backend/.env` and restart.
4. Click **Connect Slack** in the dashboard and authorize.

### Ethereal
Leave `ETHEREAL_USER`/`ETHEREAL_PASS` blank and the server auto-creates a test account. Check the console output for credentials and browse https://ethereal.email to view sent messages.

---

## Demo Walkthrough (5 minutes)

1. **Login** — Open `http://localhost:5173`, click "Dev Login (bypass)".
2. **Compose** — Click "Compose New Email", enter a subject, body, and paste some recipient emails. Set the start time ~1 minute out and click Schedule.
3. **Monitor** — Watch emails appear in the "Scheduled" tab. Switch to "Sent" tab as the worker processes them.
4. **Queue Dashboard** — Visit `http://localhost:4000/admin/queues` to see live queue state.
5. **Restart test** — Kill the backend/worker mid-schedule, restart, and verify future emails still send exactly once.
6. **Rate limiting** — Lower `MAX_EMAILS_PER_HOUR` in `.env`, schedule a burst, and observe jobs being rescheduled (not dropped).

---

## Trade-offs & Assumptions

- SMTP credentials for senders are stored in the database (production would use a secrets manager).
- `/admin/queues` is unauthenticated for demo visibility.
- Session storage uses the Express default (production should use Redis-backed sessions).
- Email body is plain text (avoids unsafe HTML handling).
- Lead file uploads are parsed in memory, limited to 2 MB.
- Slack notifications go to the `general` channel (production would let users choose a channel).
