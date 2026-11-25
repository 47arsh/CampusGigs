# Product Roadmap

Phases are delivered one at a time: implement, verify (backend, frontend, E2E
where relevant), commit, then stop for review. Schema changes are additive
only — no migrations or data rewrites. New dependencies require a stated
reason; the phases below need none.

Status: Phase 2 complete. Phase 3 next.

## Phase 1 — Public profiles (complete)

Goal: a read-only profile surface so ratings have somewhere to live.

- `GET /api/users/:id/profile` returns name, join date, completed-task count,
  rating average (`null` until reviews exist, `count: 0`), and recent reviews
  (`[]` until Phase 2). Never expose email, password, or other private fields.
- Frontend `/users/:id` page; poster/assignee names on task cards and the task
  detail page link to it.
- Unknown user → 404; malformed id → 400.

## Phase 2 — Reviews and reputation (complete)

- `Review` model: `task`, `reviewer`, `reviewee`, `rating` (1–5), `comment`;
  unique index on `(task, reviewer)`. Only participants of a `completed` task
  may review; no self-review.
- Denormalized `ratingSum`/`ratingCount` on `User`, updated atomically;
  average exposed on profiles and task cards.
- "X left you a review" notification through the existing pipeline.
- UI: review prompt on completed tasks, rating on profiles and cards.

## Phase 3 — Two-sided completion

- Assignee marks a task `submitted`; the creator confirms → `completed`.
  Auto-confirm after 72 hours without confirmation (lazy check on read, no
  cron process).
- Update browse/my-list filters, status badges, notifications, and E2E
  expectations for the new `submitted` status.
- Reviews (Phase 2) stay gated on final `completed`.
- Decision to confirm: explicit `submitted` status (recommended) vs. a flag on
  `accepted`.

## Phase 4 — Task editing and lifecycle

- Edit title/description/reward only while `open` (owner only).
- Cancel with an optional reason shown to the assignee.
- Optional `deadline`; expired-but-open tasks render as expired and are
  excluded from default browse (no background job).
- Tests: non-owner and post-acceptance edits rejected, expiry filtering.

## Phase 5 — Discovery

- Fixed `category` enum on tasks (default `other` for existing documents) with
  filter chips; Mongo text index on `{ title, description }`; sort by
  newest/reward.
- Saved tasks: `User.savedTasks: [ObjectId]` with a toggle endpoint and a
  "Saved" dashboard section.
- Add the text index to the staging index guide (`docs/staging-deployment.md`).

## Phase 6 — AI task drafting

- AI service `POST /draft-task`: free-text errand → structured
  `{ title, description, category, suggestedReward }` using the existing Gemini
  generation model (JSON schema, no RAG), protected by the internal token.
- Backend proxy with the existing AI rate limiter and timeout/error mapping.
- Frontend "Help me write this" button on the create form.
- Depends on the Phase 5 category enum.

## Phase 7 — Applicants instead of instant accept (highest risk; revisit)

- `Application` model with apply/withdraw/approve; a task leaves `open` only
  after the poster approves; notifications for apply/approve/reject.
- Replaces the current accept endpoint and changes the E2E flow; requires a
  compatibility decision (replace vs. feature flag). Recommended last and
  explicitly cuttable.

## Explicitly out of scope

- In-app chat
- Real payments or escrow
- Geolocation
