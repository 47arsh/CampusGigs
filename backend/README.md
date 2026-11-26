# CampusGigs Backend

Express 5 REST API and Socket.IO server for the CampusGigs campus marketplace. It owns authentication, the task lifecycle, persisted notifications, and the proxy call to the AI service.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start with nodemon on changes |
| `npm start` | Production entry point (`node server.js`) |
| `npm test` | Run the `node:test` suite |
| `npm run test:e2e` | End-to-end lifecycle check against a throwaway local database |

Requires Node.js 20+ and a reachable MongoDB instance.

## Configuration

Copy `.env.example` to `.env` and set at least `MONGO_URI` and `JWT_SECRET`. Configuration is validated at startup with Zod; the process exits with a readable error if a required value is missing or malformed.

| Variable | Required | Notes |
| --- | --- | --- |
| `NODE_ENV` | no | `development` (default), `test`, `production` |
| `PORT` | no | Defaults to `3000` |
| `MONGO_URI` | yes | MongoDB connection string |
| `JWT_SECRET` | yes | 32+ random characters; production refuses to start below 32 |
| `CORS_ORIGINS` | no | Comma-separated origins, defaults to `http://localhost:5173` |
| `AI_SERVICE_URL` | no | Base URL of the FastAPI AI service |
| `AI_SERVICE_TOKEN` | no | Shared secret sent as `X-Internal-Token`; required in production whenever `AI_SERVICE_URL` is set |
| `TRUST_PROXY` | no | Trusted proxy hop count (`false` when directly exposed) |
| `LOG_LEVEL` | no | `error` / `warn` / `info` / `debug` |
| `TEST_MONGO_URI` | tests | Local MongoDB for the test suite |

Never commit `.env` or real secrets.

## API Overview

All endpoints are prefixed with `/api`. JSON bodies are limited to 32 KB and validated with Zod; invalid input returns `400` with a `message` and field `errors`.

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | – | Create an account |
| `POST` | `/api/auth/login` | – | Obtain a 1-hour JWT |
| `GET` | `/api/auth/me` | JWT | Current user profile |
| `GET` | `/api/tasks` | – | Browse tasks (`status`, `minReward`, `maxReward`, `page`, `limit`) |
| `POST` | `/api/tasks` | JWT | Publish a task |
| `GET` | `/api/tasks/my/posted` | JWT | Tasks created by the caller (`page`, `limit`) |
| `GET` | `/api/tasks/my/accepted` | JWT | Tasks accepted by the caller (`page`, `limit`) |
| `GET` | `/api/tasks/:id` | – | Task detail (participants exposed by name only) |
| `PATCH` | `/api/tasks/:id/accept` | JWT | Accept an open task |
| `PATCH` | `/api/tasks/:id/submit` | JWT | Submit an accepted task you hold for confirmation |
| `PATCH` | `/api/tasks/:id/confirm` | JWT | Confirm a submitted task you posted as completed |
| `PATCH` | `/api/tasks/:id/cancel` | JWT | Cancel your own open task |
| `GET` | `/api/notifications` | JWT | List notifications (`page`, `limit`) |
| `PATCH` | `/api/notifications/:id/read` | JWT | Mark a notification as read |
| `POST` | `/api/ai/chat` | JWT | Ask the campus assistant (rate limited) |
| `GET` | `/health` | – | Readiness probe |

List responses keep the existing array fields and add a `pagination` object (`page`, `limit`, `total`, `totalPages`, `hasNextPage`, `hasPrevPage`).

### Task lifecycle

`open -> accepted -> submitted -> completed`, with `cancelled` available only while a task is open. Every transition is a single atomic `findOneAndUpdate` guarded by the expected current status, so concurrent accept/submit/confirm/cancel requests cannot double-apply or corrupt state. A submission left unconfirmed for 72 hours is auto-completed on the next task read (no background job).

### Realtime notifications

Task events persist a notification in MongoDB and emit it to the recipient's Socket.IO room (`user:<id>`). Socket connections authenticate with the same JWT and are rejected without a valid token.

## Testing

`npm test` runs the suite with `node --test` against an isolated `campusgigs_test_*` database. The helper refuses Atlas or shared cluster URIs; point `TEST_MONGO_URI` at local MongoDB (default `mongodb://127.0.0.1:27017`). Never run the suite against production data.

## Operations

* `GET /health` answers `{ "status": "ok" }`; the HTTP server only starts listening after MongoDB connects.
* `SIGTERM`/`SIGINT` stop accepting connections, close Socket.IO, disconnect MongoDB, and exit; a 10-second timer forces exit if shutdown stalls.
* Task indexes (`status + createdAt`, `createdBy + createdAt`, `assignedTo + createdAt`) are declared on the schema and built by the driver at startup. No manual migration is needed.
* `helmet` sets security headers; auth and AI endpoints are rate limited.
