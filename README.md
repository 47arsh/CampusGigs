# CampusGigs

> A student-to-student marketplace for small tasks and errands within a campus.

CampusGigs is a full-stack web application that allows students to **post tasks they need help with and lets other students discover, accept, and complete those tasks in exchange for a reward**.

The original idea was to make small campus errands easier to coordinate. Instead of relying on informal messages or asking people individually, students can post a task on a shared platform where other students can find it and choose to help.

The project started as a MERN application focused on the core task marketplace and gradually evolved to include authentication, task management, validation, real-time notifications, and an AI-powered campus knowledge assistant using **Retrieval-Augmented Generation (RAG)**.

The goal of the project is to explore how a complete application can be designed, built, and extended with additional services as its requirements grow.

---

## What is CampusGigs?

CampusGigs connects students who **need a task completed** with students who are **willing to complete it**.

A student can:

1. Create a task with its details, reward, and relevant information.
2. Make the task available to other students.
3. Other students can browse available tasks and accept one.
4. The task progresses through its lifecycle until completion.
5. Participants receive real-time notifications when important task events occur.

The same model can be used for different types of campus activities, from simple errands to other small student-to-student requests.

```text
Task Creator
     │
     │ Creates task
     ▼
 CampusGigs
     │
     │ Task becomes available
     ▼
Task Marketplace
     │
     │ Student accepts
     ▼
Task Executor
     │
     │ Submits work
     ▼
  Submitted
     │
     │ Poster confirms (or auto-confirm after 72h)
     ▼
  Completed
```

---

## Why I built it

CampusGigs started as a way to build something practical while learning full-stack development.

Rather than building isolated CRUD features, the project provided a single application through which I could work with:

* REST API design
* Authentication and authorization
* MongoDB data modeling
* API validation
* Frontend-backend communication
* Task state and business logic
* Real-time communication with Socket.IO
* Persistent notification systems
* Service separation
* Retrieval-Augmented Generation
* Vector search and embeddings

As the project grew, I extended the original marketplace with additional capabilities instead of replacing its core architecture.

The application now includes a real-time notification system that allows users to receive updates when tasks are accepted, submitted, completed, or cancelled. Notifications are persisted in MongoDB so they remain available even when a user is offline.

I also added a separate AI service for campus-related questions. This allowed me to explore how an existing web application can be extended with an AI component without putting the AI logic directly into the main backend.

---

## Core Features

### Task Marketplace

* Create and publish campus tasks
* Browse available tasks
* Accept tasks posted by other students
* Submit completed work for the poster's confirmation
* Confirm submissions as the poster, with automatic completion after 72 hours
* Cancel tasks
* Track task status through its lifecycle
* Reward-based task model

### Authentication & Authorization

* User registration and login
* JWT-based authentication
* Password hashing with bcrypt
* Protected API routes
* User-specific task and notification access

### Student Profiles

* Public profile page with join date, completed gig count, and average rating
* Task cards link to the poster and assignee profiles and show the poster's rating
* Participants can review each other after a task is completed; reviews appear on profiles

### Real-Time Notifications

CampusGigs uses **Socket.IO** to provide real-time updates for important task events.

```text
Task Action
     │
     ▼
Express Controller
     │
     ├──► MongoDB
     │      │
     │      └── Persist notification
     │
     └──► Socket.IO
            │
            ▼
       Target User
            │
            ▼
       🔔 Notification
```

Notifications are persisted in MongoDB and delivered through Socket.IO when the recipient is online.

This means notifications remain available even if the user is offline and reconnects later.

### AI-Powered Campus Assistant

CampusGigs also includes a separate AI service that uses **Retrieval-Augmented Generation (RAG)** to answer questions using campus-specific knowledge.

The system uses:

* Document ingestion
* Text chunking
* Embeddings
* Vector search
* ChromaDB
* Gemini
* LangChain
* FastAPI

The AI service is kept separate from the main Express backend so that the core marketplace remains independent of the AI functionality.

```text
CampusGigs Backend
        │
        │ AI request
        ▼
   FastAPI AI Service
        │
        ▼
   Retrieval Layer
        │
        ├── Embeddings
        └── ChromaDB
        │
        ▼
      Gemini
        │
        ▼
     Response
```

---

## Technology Stack

### Frontend

* React
* Vite
* React Router
* Tailwind CSS
* Fetch API
* Socket.IO Client

### Backend

* Node.js
* Express.js
* MongoDB
* Mongoose
* JWT
* bcryptjs
* Zod
* Socket.IO

### AI Service

* Python
* FastAPI
* LangChain
* Gemini API
* Gemini Embeddings
* ChromaDB

### Development & Deployment

* Git
* GitHub
* Vercel
* Render

---

## Project Architecture

CampusGigs currently consists of a main MERN application and a separate AI service.

```text
                    CampusGigs
                        │
             ┌──────────┴──────────┐
             │                     │
        Main Application       AI Service
             │                     │
       React + Express          FastAPI
             │                     │
          MongoDB            LangChain
             │                     │
       Socket.IO             Embeddings
             │                     │
      Real-time events        ChromaDB
                                   │
                                 Gemini
```

The separation allows the core marketplace and AI functionality to evolve independently while communicating through APIs.

---

## Project Direction

CampusGigs is being developed incrementally.

The foundation remains the **campus task marketplace**. Additional functionality is built around that foundation to improve how students create, discover, complete, and interact with tasks.

Future improvements will focus on areas such as:

* Smarter task discovery
* AI-assisted task creation
* Personalized task matching
* Search and filtering
* Reputation and reviews
* Further improvements to the campus AI assistant

The goal is to evolve the application while keeping the architecture understandable, maintainable, and grounded in the original campus task marketplace idea.

---

## Project Structure

```text
CampusGigs/
├── frontend/      React + Vite single-page app
├── backend/       Express REST API, Socket.IO server, MongoDB models
├── ai-service/    FastAPI RAG service (LangChain + Gemini + ChromaDB)
└── .github/       CI workflow (backend tests, AI tests, frontend checks)
```

---

## Local Development

Prerequisites: Node.js 20+ (22 LTS recommended), Python 3.10, and a local MongoDB instance.

### 1. Backend API

```bash
cd backend
npm install
cp .env.example .env        # then fill in MONGO_URI and JWT_SECRET
npm run dev                 # nodemon, http://localhost:3000
```

Required environment variables (see `backend/.env.example` for the full list):

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGO_URI` | yes | MongoDB connection string |
| `JWT_SECRET` | yes | Signing key for access tokens (32+ random characters; enforced in production) |
| `PORT` | no | HTTP port, defaults to `3000` |
| `CORS_ORIGINS` | no | Comma-separated allowed browser origins |
| `AI_SERVICE_URL` | no | Base URL of the AI service |
| `AI_SERVICE_TOKEN` | no | Shared secret forwarded to the AI service; production requires it together with `AI_SERVICE_URL` |
| `TRUST_PROXY` | no | Number of trusted proxy hops (`false` when directly exposed) |
| `LOG_LEVEL` | no | `error` / `warn` / `info` / `debug` |
| `TEST_MONGO_URI` | tests | Local MongoDB used by the test suite |

### 2. AI service

```bash
cd ai-service
python -m venv .venv
.venv/Scripts/activate       # source .venv/bin/activate on macOS/Linux
pip install -r requirements-dev.txt
cp .env.example .env         # set GEMINI_API_KEY and AI_SERVICE_TOKEN
python rag/ingest.py         # build the Chroma vector store from knowledge/
python -m uvicorn main:app --reload --port 8000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev                  # http://localhost:5173
```

Optional frontend variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | `http://localhost:3000/api` | REST API base URL |
| `VITE_SOCKET_URL` | Derived from `VITE_API_URL` | Socket.IO server URL |

---

## Testing

```bash
cd backend && npm test                                     # node:test + local MongoDB
cd ai-service && .venv/Scripts/python.exe -m pytest tests -q
cd frontend && npm test && npm run lint && npm run build
```

The backend suite refuses to run against shared or Atlas clusters and uses
throwaway `campusgigs_test_*` databases on `TEST_MONGO_URI`
(default `mongodb://127.0.0.1:27017`). CI runs all three suites on every push
and pull request via `.github/workflows/ci.yml`.

---

## Deployment Notes

* **Backend** — run `npm start` (`node server.js`) on Node 20+. The process
  exposes `GET /health` for readiness checks, listens only after MongoDB
  connects, and drains Socket.IO connections and the database on
  `SIGTERM`/`SIGINT`.
* **Indexes** — task indexes are declared on the Mongoose schema and built by
  the driver at startup. No manual migration or data backfill is required;
  existing documents remain compatible.
* **CORS** — set `CORS_ORIGINS` to the deployed frontend origin(s). In
  production behind a reverse proxy set `TRUST_PROXY` to the number of hops so
  rate limiting sees real client IPs.
* **AI service** — set `AI_SERVICE_TOKEN` on both services; the backend sends
  it as `X-Internal-Token` and the AI service rejects requests without it.
  Point `AI_SERVICE_URL` at the deployed service, use `APP_ENV=production` on
  the AI service, and note that both services refuse to start in production if
  the URL/token pair or a 32+ character `JWT_SECRET` is missing.
* **Frontend** — build with `npm run build` and host `dist/`; set
  `VITE_API_URL` and `VITE_SOCKET_URL` at build time to the public backend
  URLs.

For the full staging checklist (environment variables, hosting, MongoDB
indexes, Chroma persistence, smoke tests, and rollback), see
[`docs/staging-deployment.md`](docs/staging-deployment.md).
