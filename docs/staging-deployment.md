# Staging Deployment Guide

This guide describes how to run CampusGigs on a staging environment: the Vite
frontend, the Express + Socket.IO API, the FastAPI AI service, MongoDB, and the
persisted Chroma vector store.

Nothing here should ever point at the production database. Use a dedicated
staging MongoDB database (or cluster) and disposable test accounts.

## 1. Topology

```text
Browser ── HTTPS ──► Static frontend (dist/)
   │                     │
   │ REST + WebSocket    │ VITE_API_URL / VITE_SOCKET_URL
   ▼                     ▼
Express API (public) ── internal HTTP + X-Internal-Token ──► FastAPI AI service
   │                                                            │
   ▼                                                            ▼
MongoDB Atlas (staging db)                              chroma_db/ (persistent disk)
```

- The API is the only browser-facing server. Socket.IO runs on the same
  process and port as the REST API.
- The AI service must not be publicly reachable in production; only the API
  needs to call it.
- The frontend is a static bundle; it needs SPA rewrites so client-side routes
  (`/login`, `/dashboard`) resolve to `index.html`.

## 2. Environment variables

### Backend (`backend/`)

| Variable | Required | Staging value |
| --- | --- | --- |
| `NODE_ENV` | yes | `production` (enables fail-closed checks) |
| `PORT` | no | Provided by the host, defaults to `3000` |
| `MONGO_URI` | yes | Staging connection string, e.g. `mongodb+srv://…/campusgigs_staging` |
| `JWT_SECRET` | yes | 32+ random characters; startup fails below 32 in production |
| `CORS_ORIGINS` | yes | `https://staging-app.example` (comma-separated, exact origins) |
| `AI_SERVICE_URL` | yes | Internal URL of the AI service, e.g. `https://campusgigs-ai-staging.onrender.com` |
| `AI_SERVICE_TOKEN` | yes | Shared secret; must match the AI service value |
| `TRUST_PROXY` | recommended | `1` behind one reverse proxy/load balancer, `false` if directly exposed |
| `LOG_LEVEL` | no | `info` (use `debug` only while diagnosing) |

The API refuses to start in production when `AI_SERVICE_URL` and
`AI_SERVICE_TOKEN` are not configured as a pair, or when `JWT_SECRET` is
shorter than 32 characters.

### AI service (`ai-service/`)

| Variable | Required | Staging value |
| --- | --- | --- |
| `APP_ENV` | yes | `production` (refuses to start without a token) |
| `AI_SERVICE_TOKEN` | yes | Same value as the backend |
| `GEMINI_API_KEY` | yes for answers | Gemini API key; never exposed to the browser |
| `GEMINI_EMBEDDING_MODEL` | no | Defaults to `gemini-embedding-2-preview`; must match ingestion |
| `GEMINI_GENERATION_MODEL` | no | Defaults to `gemini-3.6-flash` |

### Frontend (`frontend/`)

Build-time variables (Vite inlines them, so rebuild after changing them):

| Variable | Example |
| --- | --- |
| `VITE_API_URL` | `https://api-staging.example/api` |
| `VITE_SOCKET_URL` | `https://api-staging.example` |

These are public values. Never put secrets in `VITE_*` variables.

## 3. Build and start commands

Backend:

```bash
cd backend
npm ci
npm start                 # node server.js, listens after MongoDB connects
```

AI service:

```bash
cd ai-service
python -m pip install -r requirements.txt
python rag/ingest.py      # once per environment / knowledge update
python -m uvicorn main:app --host 0.0.0.0 --port "$PORT"
```

Frontend:

```bash
cd frontend
npm ci
npm run build             # output in dist/
```

Host `frontend/dist/` on any static host with an SPA rewrite
(`/* -> /index.html`).

## 4. Hosting configuration

The stack fits a typical split: static frontend (Vercel/Netlify/Cloudflare
Pages), API as a Node web service (Render/Railway/Fly), and the AI service as a
Python web service with a persistent disk.

- **API**: Node 20+; start `npm start`; health check `GET /health`. Enable
  WebSocket upgrades (Socket.IO). Use a single instance for staging: rate
  limiting is in-memory per process, and multiple instances would also need
  sticky sessions for Socket.IO.
- **AI service**: Python 3.10; start the uvicorn command above; health check
  `GET /health`. Mount a persistent disk for `chroma_db/`. Keep the service on
  a private/internal URL where the platform supports it.
- **Frontend**: build command `npm ci && npm run build`, output `dist/`,
  configure the SPA rewrite.
- **MongoDB Atlas**: create a staging database/user, restrict network access to
  the hosting provider's egress addresses (or use private endpoints), and never
  share the production user.

Example start commands only; adapt paths to the host:

```bash
# API
npm start
# AI
python -m uvicorn main:app --host 0.0.0.0 --port $PORT
```

## 5. CORS, proxy, and Socket.IO

- `CORS_ORIGINS` must contain the exact staging frontend origin(s). It is used
  for both REST CORS and the Socket.IO handshake.
- Behind one proxy/load balancer set `TRUST_PROXY=1` so rate limiting sees real
  client IPs. Do not trust more hops than actually exist.
- The host must allow WebSocket upgrades and long-lived connections; serverless
  function platforms are not suitable for the API.
- Socket clients authenticate with the same JWT as the REST API. Expired
  tokens are rejected at handshake and existing sockets are disconnected when
  their token expires (1 hour).

## 6. MongoDB staging setup

Never reset or drop a shared database. Create a separate staging database, for
example `campusgigs_staging`, on a staging cluster.

### Indexes

The schemas declare these indexes:

| Collection | Index |
| --- | --- |
| `tasks` | `{ status: 1, createdAt: -1 }` |
| `tasks` | `{ createdBy: 1, createdAt: -1 }` |
| `tasks` | `{ assignedTo: 1, createdAt: -1 }` |
| `notifications` | `{ recipient: 1 }` |
| `notifications` | `{ read: 1 }` |
| `notifications` | `{ createdAt: 1 }` |
| `notifications` | `{ recipient: 1, read: 1, createdAt: -1 }` |
| `users` | `{ email: 1 }` (unique) |

Mongoose builds them at startup (`autoIndex`). Pre-creating them on a large
staging collection avoids a slow first boot:

```bash
mongosh "$STAGING_MONGO_URI" --eval '
const app = db.getSiblingDB("campusgigs_staging");
app.tasks.createIndex({ status: 1, createdAt: -1 });
app.tasks.createIndex({ createdBy: 1, createdAt: -1 });
app.tasks.createIndex({ assignedTo: 1, createdAt: -1 });
app.notifications.createIndex({ recipient: 1 });
app.notifications.createIndex({ read: 1 });
app.notifications.createIndex({ createdAt: 1 });
app.notifications.createIndex({ recipient: 1, read: 1, createdAt: -1 });
app.users.createIndex({ email: 1 }, { unique: true });
'
```

Before creating the unique email index on an existing database, check for
case-insensitive duplicates:

```bash
mongosh "$STAGING_MONGO_URI" --eval '
db.getSiblingDB("campusgigs_staging").users.aggregate([
  { $group: { _id: { $toLower: "$email" }, n: { $sum: 1 } } },
  { $match: { n: { $gt: 1 } } }
]);
'
```

Resolve any duplicates manually; do not delete data automatically.

Verify:

```bash
mongosh "$STAGING_MONGO_URI" --eval '
const app = db.getSiblingDB("campusgigs_staging");
printjson(app.tasks.getIndexes().map(i => i.name));
printjson(app.notifications.getIndexes().map(i => i.name));
printjson(app.users.getIndexes().map(i => ({ name: i.name, unique: !!i.unique })));
'
```

Expected: `_id_` plus the indexes above (names are the concatenated key
pattern, e.g. `status_1_createdAt_-1`), and `email_1` with `unique: true`.

Do **not** run `dropIndexes()` or `syncIndexes()` against a database that holds
shared data without reviewing what would be removed. `syncIndexes()` drops
indexes that are not declared in the schema.

### Document compatibility

The schemas only require fields the application has always written; there are
no migrations or backfills. Read-only checks (all should return `0`):

```bash
mongosh "$STAGING_MONGO_URI" --eval '
const app = db.getSiblingDB("campusgigs_staging");
print("invalid task status:", app.tasks.countDocuments({ status: { $nin: ["open","accepted","submitted","completed","cancelled"] } }));
print("tasks without creator:", app.tasks.countDocuments({ createdBy: { $exists: false } }));
print("tasks without title:", app.tasks.countDocuments({ title: { $exists: false } }));
print("invalid notification type:", app.notifications.countDocuments({ type: { $nin: ["task_accepted","task_submitted","task_completed","task_cancelled","review_received","general"] } }));
print("notifications without recipient:", app.notifications.countDocuments({ recipient: { $exists: false } }));
'
```

## 7. ChromaDB ingestion and persistence

- `ai-service/chroma_db/` is generated data and is git-ignored. It must exist in
  the deployed AI service, on a persistent volume if the host has ephemeral
  storage.
- Run ingestion once per environment (and after editing `knowledge/*.md`):

  ```bash
  cd ai-service
  set -a; . ./.env; set +a          # or export the variables your host provides
  python rag/ingest.py
  ```

- Ingestion clears stale chunk IDs and keeps the `campusgigs_kb` collection at
  the configured path. Changing `GEMINI_EMBEDDING_MODEL` changes vector
  dimensions, so re-ingest whenever the embedding model changes.
- Snapshot or back up the volume before re-ingesting on a live environment.
- `GET /health` proves only that the process started; it does not prove the
  vector store is populated. Smoke-test `POST /chat` through the API.

## 8. Internal AI authentication

- Set the same `AI_SERVICE_TOKEN` on both services. The API forwards it as
  `X-Internal-Token`; the AI service compares it in constant time.
- With `APP_ENV=production`, the AI service refuses to start without a token.
- Keep the AI service off the public internet where possible; the token is
  defense in depth, not a substitute for network isolation.

## 9. Health checks

| Service | Path | Expected |
| --- | --- | --- |
| API | `GET /health` | `200 {"status":"ok"}`; the server listens only after MongoDB connects |
| AI service | `GET /health` | `200 {"status":"ok"}` (does not verify embeddings or Gemini) |
| Frontend | `/` | `200` and the SPA shell |

Use the API health check as the platform readiness probe. It intentionally
does not require the AI service, so an AI outage does not take down the
marketplace.

## 10. Verification

Local automated end-to-end check (disposable local MongoDB only; never point
it at staging or production):

```bash
cd backend
npm run test:e2e
```

It boots the real API entrypoint on a throwaway `campusgigs_e2e_staging_*`
database and covers registration, login, task creation, acceptance, submission,
poster confirmation, realtime notifications, persistence, privacy, token expiry,
and pagination limits; the database is dropped afterwards.

Staging smoke checklist (disposable accounts):

1. Register two accounts and log in.
2. Create a task, browse it from the second account, accept it.
3. Confirm the creator's bell shows the acceptance live and after a reload.
4. Submit the task from the assignee account and confirm the poster's bell shows
   the submission; then confirm it as the poster and check the completion
   notification on the assignee account.
5. Open the task detail while logged out and confirm no emails are exposed.
6. Ask the AI assistant a policy question and confirm an answer with sources.
7. Confirm `GET /health` on both services and that the frontend loads deep
   links such as `/login` and `/dashboard`.

## 11. Rollback

1. Redeploy the previous release of the affected service. There are no schema
   migrations to reverse; new indexes are additive and older code ignores them.
2. Restore the frontend build to the previous `dist/` artifact.
3. Keep the `chroma_db/` volume across rollbacks; restore its snapshot if the
   knowledge base or embedding model changed.
4. Rolling `JWT_SECRET` signs every user out; rolling `AI_SERVICE_TOKEN`
   requires redeploying both services with the matching value.
5. Do not roll back by resetting or dropping the staging database.
