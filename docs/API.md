# StackScout AI — API Reference

All endpoints are under `/api`. Responses use a consistent envelope:

- Success: `{ "data": ... }`
- Error: `{ "error": "message", "details"?: ... }` with an appropriate HTTP status.

All endpoints (except public marketing pages) require an authenticated Supabase session — requests are made with the user's session cookie. Rate limits are applied per user/IP on expensive endpoints.

## Jobs

### `POST /api/jobs/search`
Manual + natural-language job search across all configured providers.

Body:
```json
{
  "query": "react developer",
  "filters": { "location": "Remote", "remote_status": ["remote"], "salary_min": 80000 },
  "page": 1,
  "page_size": 20,
  "sort": "relevance",
  "natural_language": false,
  "save_search": false
}
```
`natural_language: true` treats `query` as free text ("remote React jobs paying $80k") and uses AI to extract structured params when `OPENAI_API_KEY` is set.

Response `data`: `{ jobs, total, page, page_size, providers: [{name,count,error,mocked}], used_mock, resolved_query, resolved_filters }`.

### `POST /api/jobs/discover`
AI-powered personalized discovery. Generates search queries from the candidate profile (resume) when `queries` is omitted.

Body: `{ "queries"?: string[], "filters"?: {...}, "max_results_per_query"?: number }`

Response `data`: `{ jobs, total, queries, generated_queries: [{query, rationale}], providers, used_mock }`.

### `GET /api/jobs?page=&page_size=&q=&source=&remote=`
List persisted active jobs, newest first.

### `GET /api/jobs/:id`
Job detail.

### `POST /api/jobs/:id/verify`
Checks the application URL; marks the job `expired` only on confirmed 404/410. Updates `last_verified_at`.

## Resumes & Candidate Profile

### `POST /api/resumes/upload`
`multipart/form-data` with `file` (PDF, DOCX, or TXT, ≤10 MB). Stores in the private `resumes` bucket and creates a resume row (`status: pending`).

### `GET /api/resumes`
List the user's resumes (metadata only).

### `GET /api/resumes/:id` / `DELETE /api/resumes/:id`
Detail (text preview) / delete (removes storage object + row).

### `POST /api/resumes/:id/analyze`
Extracts text, runs AI structured parsing (requires `OPENAI_API_KEY`), and upserts the candidate profile + skills/experience/education/projects. Returns `{ resume_id, profile, parsed }`.

### `GET /api/candidate-profile`
Full bundle: `profile`, `skills`, `experiences`, `education`, `projects`.

### `PATCH /api/candidate-profile`
Update confirmed profile fields (name, headline, location, URLs, summary, years).

## Matching

### `POST /api/matches`
Run the weighted matching engine. Body: `{ "job_ids"?: string[], "limit"?: number, "ai_enrich"?: boolean }`. Without `job_ids`, scores saved jobs + recent jobs. Upserts `job_matches`. Returns `{ analyzed, matches }`.

### `GET /api/matches/list?min_score=&limit=`
Persisted matches joined with job data, sorted by score desc.

## Saved Jobs & Applications

### `GET /api/saved-jobs` — saved jobs joined with `jobs`.
### `POST /api/saved-jobs` — `{ "job_id", "notes"? }` (upsert).
### `DELETE /api/saved-jobs?job_id=` — unsave.

### `GET /api/applications?status=` — applications with `jobs` join + `events` timeline.
### `POST /api/applications` — create; body per `applicationCreateSchema` (job_id, status, dates, recruiter info, notes, salary_expected, application_url). Auto-logs a `created` event.
### `PATCH /api/applications/:id` — update fields; status changes auto-log an event.
### `DELETE /api/applications/:id`
### `POST /api/applications/:id` — add event `{ "event_type", "event_date", "notes"? }`.

Application statuses: `interested, saved, preparing, applied, assessment, interview, technical_interview, final_interview, offer, rejected, withdrawn`.

## AI

### `POST /api/ai/assistant`
Chat with the career assistant. Body `{ "message", "conversation_id"? }` → `{ conversation_id, reply }`. History is persisted per user.

### `GET /api/ai/assistant` — conversation list.
### `GET /api/ai/conversations/:id` — messages.

### `POST /api/ai/documents?type=...`
- `type=cover-letter` — `{ job_id, tone?, additional_instructions? }`
- `type=tailor-resume` — `{ job_id, additional_instructions? }`
- `type=summary` — professional summary
- `type=match-explain` — `{ job_id }` — AI explanation of the deterministic match score

All return `{ document, content }` and persist to `generated_documents`. Requires `OPENAI_API_KEY`.

### `GET /api/documents` — generated documents list.

## Alerts, Notifications, Settings

### `GET|POST|PATCH|DELETE /api/alerts`
Search alerts (`name`, `filters`, `frequency: daily|twice_daily|weekly`, `minimum_match_score`, `is_active`). PATCH/DELETE by `id`.

### `GET /api/notifications?unread=true` / `POST /api/notifications` `{ ids? } | { all: true }`

### `GET /api/notifications/stream` — SSE stream for real-time notifications.

## AI Tools

### `POST /api/ai/tools` — `{ tool, params }`
Available tools:
- `resume-score` — Score resume against job
- `skill-gaps` — Analyze skill gaps
- `mock-interview` — Generate mock interview questions
- `evaluate-answer` — Evaluate interview answer
- `salary-negotiation` — Generate negotiation script
- `predict-questions` — Predict interview questions
- `cover-letter-variants` — Generate 4 cover letter styles
- `follow-up-email` — Generate follow-up email
- `career-path` — Career path advice
- `portfolio-suggestions` — Portfolio project ideas

## Bulk Operations

### `PATCH /api/applications/bulk` — `{ ids: string[], status: string }`
Update status for multiple applications.

### `DELETE /api/applications/bulk` — `{ ids: string[] }`
Delete multiple applications.

### `POST /api/applications/export` — `{ ids?: string[] }`
Export applications to CSV. Returns `text/csv` file.

## Resume Builder

### `POST /api/resumes/pdf` — `{ name, email, phone, location, linkedin?, website?, summary, sections, template }`
Generate PDF resume from builder data. Returns `application/pdf` file.

## Interview Scheduling

### `POST /api/interviews/schedule` — `{ application_id, interview_date, interview_type, interviewer_name?, interviewer_email?, location?, meeting_link?, notes? }`
Schedule interview and generate calendar invite link.

## LinkedIn Integration

### `POST /api/profile/linkedin` — `{ access_token }`
Import LinkedIn profile data.

## GET|PATCH /api/settings` — theme, notification prefs, privacy flags.
### `GET|PATCH /api/profile` — `{ profile?, preferences? }` payloads.

## Dashboard & Admin

### `GET /api/dashboard/stats`
User dashboard aggregates: counts, top matches, recent applications, pipeline.

### `GET /api/admin/stats` — admin-only aggregates (403 otherwise).
### `GET|PATCH /api/admin/users` — user list / role management (super_admin for PATCH).
### `POST /api/admin/discover` — queue an Inngest discovery run.

### `DELETE /api/account` — permanently delete the account and data.

## Background (Inngest)

`GET|POST|PUT /api/inngest` — served by the Inngest SDK. Functions: `daily-job-discovery` (cron 06:00 UTC), `on-demand-discovery` (event `jobs/discovery.requested`), `refresh-job-status` (weekly), `process-search-alerts` (every 6h).

## Validation

All request bodies are validated with Zod (`src/lib/validations`). Invalid payloads → `422` with `details` containing flattened field errors.

## Public API (v1)

External API for programmatic access. Authenticate with an API key created in **Settings → Developer**.

**Auth:** `Authorization: Bearer <key>` or `X-API-Key: <key>` header. Keys have scopes: `read`, `write`, `admin`.

### Key management (session auth)

- `GET /api/account/api-keys` — list your keys (secrets never returned)
- `POST /api/account/api-keys` — create `{ name, scopes[], expires_in_days? }` → returns plaintext `key` **once**
- `DELETE /api/account/api-keys/:id` — revoke a key

### v1 endpoints

| Method | Path | Scope | Description |
|--------|------|-------|-------------|
| GET | `/api/v1/jobs` | read | List active jobs. Params: `page`, `page_size`, `q`, `location`, `remote`, `employment_type` |
| GET | `/api/v1/jobs/:id` | read | Job detail with description, skills, salary |
| GET | `/api/v1/matches` | read | Your job matches. Params: `min_score`, `limit` |
| GET | `/api/v1/applications` | read | Your applications. Param: `status`, `limit` |
| POST | `/api/v1/applications` | write | Create/update application `{ job_id, status?, notes?, application_url?, salary_expected? }` |
| GET | `/api/v1/profile` | read | Your candidate profile, skills, experience, education |

Errors: `401` invalid/expired/revoked key or missing scope; `404` resource not found; `422` validation error.

Example:
```bash
curl -H "Authorization: Bearer ssk_..." "https://yourapp.com/api/v1/jobs?q=react&remote=true"
```
