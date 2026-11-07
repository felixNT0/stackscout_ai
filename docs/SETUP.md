# StackScout AI — Setup Guide

AI-powered job discovery, matching, and application management SaaS.

## Prerequisites

- Node.js 20+
- pnpm (`npm i -g pnpm` or `corepack enable`)
- A Supabase project (free tier works)
- API keys for job providers and AI (see below — the app degrades gracefully without them)

## 1. Install

```bash
pnpm install
cp env.example .env.local   # then fill in values (env.example is the template; .env.local is what Next.js loads)
```

> Note: the repo ships `env.example` (no leading dot) as the template. Copy it to `.env.local`.

## 2. Supabase setup

1. Create a project at https://supabase.com.
2. Project Settings → API: copy the project URL, anon/publishable key, and service-role key into `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only, never expose)
3. Authentication → URL Configuration: set Site URL to `http://localhost:3000` and add redirect URLs:
   - `http://localhost:3000/auth/callback`
   - your production domain equivalent.
4. Authentication → Providers: enable Email (default) and optionally Google (requires `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`).
5. Set `DATABASE_URL` in `.env.local` to your Postgres connection string. For Supabase use the **Session pooler** URI (Dashboard → Connect): `postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require` — the direct `db.*` host is IPv6-only and often unreachable. Any Postgres works (Neon, RDS, etc.) since data access is via Prisma, not Supabase.
6. Run the migrations (SQL editor or psql) — they create the app tables, RLS policies, and the private `resumes` storage bucket:

```bash
# Option A — paste each file into the SQL editor, in order:
#   src/supabase/migrations/001_initial_schema.sql
#   src/supabase/migrations/002_roles_rls.sql

# Option B — psql (works against any Postgres, incl. Supabase pooler or Neon):
psql "$DATABASE_URL" -f src/supabase/migrations/001_initial_schema.sql
psql "$DATABASE_URL" -f src/supabase/migrations/002_roles_rls.sql
```

`002_roles_rls.sql` also creates the private `resumes` storage bucket (Supabase Storage) and its RLS policies, enables RLS on all tables, and adds the `role` column (`user`/`admin`/`super_admin`) to `profiles`.

> **Architecture note:** data access goes through **Prisma** (`prisma/schema.prisma`, client generated to `src/generated/prisma` on `postinstall`) using `DATABASE_URL` — ownership is enforced in application code via `user_id` filters since Prisma connects as the DB owner and bypasses RLS. Supabase is still used for **Auth** (sessions via publishable key) and **Storage** (resume files, session-scoped so storage RLS applies). `SUPABASE_SERVICE_ROLE_KEY` is only needed if you use `createAdminClient()` — currently nothing requires it. To make yourself admin after signing up:

```sql
UPDATE profiles SET role = 'admin' WHERE user_id = '<your-auth-user-id>';
```

## 3. Third-party API keys

| Service | Env vars | Where to get | Required? |
|---|---|---|---|
| OpenAI | `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_EMBEDDING_MODEL` | https://platform.openai.com/api-keys | For resume parsing, AI matching explanations, assistant, query generation, embeddings |
| Tavily | `TAVILY_API_KEY` | https://app.tavily.com | Web-discovery leads (job pages) |
| Adzuna | `ADZUNA_APP_ID`, `ADZUNA_API_KEY` | https://developer.adzuna.com | Structured job vacancies (best global coverage) |
| Jooble | `JOOBLE_API_KEY` | https://jooble.org/api/about | Additional vacancy coverage |
| Greenhouse | `GREENHOUSE_BOARD_TOKENS` (comma-separated board tokens) | Public boards API — no key | Per-company job boards |
| Lever | `LEVER_COMPANY_SLUGS` (comma-separated company slugs) | Public postings API — no key | Per-company job boards |
| Inngest | `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` | https://app.inngest.com | Background jobs/alerts (dev works without keys via `npx inngest-cli dev`) |
| Resend | `RESEND_API_KEY`, `EMAIL_FROM` | https://resend.com | Transactional email (optional) |
| Google OAuth | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google Cloud Console | Optional sign-in provider |

**Without keys:** the app still runs. Job search falls back to a clearly-labelled **demo provider** (every result is badged "Demo" and `is_mock` is set — never presented as real vacancies). AI features return a configuration notice. Everything else (auth, resume storage, applications, alerts, settings) works once Supabase is configured.

## 4. Run

```bash
pnpm dev        # http://localhost:3000
```

Background jobs (optional but recommended):

```bash
npx inngest-cli@latest dev   # local Inngest dev server on :8288
```

The app serves the Inngest endpoint at `/api/inngest`. Scheduled functions: daily discovery (06:00 UTC), weekly stale-job expiry (Sun 03:00 UTC), alert processing (every 6h).

## 5. Test & verify

```bash
pnpm test          # vitest unit tests (dedupe, matching engine, providers)
pnpm lint          # eslint
pnpm exec tsc --noEmit
pnpm build         # production build
```

## 6. Deploy (Vercel + Supabase)

1. Push the repo to GitHub/GitLab and import into Vercel.
2. Add all env vars from `.env.local` in Vercel → Project → Settings → Environment Variables.
3. Set `NEXT_PUBLIC_APP_URL` to your production domain.
4. Update Supabase auth redirect URLs for the production domain.
5. Deploy. Run the SQL migrations against the production Supabase project.
6. For Inngest: connect the app in the Inngest dashboard (URL `https://<domain>/api/inngest`) or use `INNGEST_EVENT_KEY`/`INNGEST_SIGNING_KEY`.

## Project layout

- `src/app` — marketing pages, auth, dashboard, API routes (`/api/*`), Inngest endpoint
- `src/services/providers` — job-source adapters (Tavily, Adzuna, Jooble, Greenhouse, Lever, demo)
- `src/services/job-discovery` — orchestration, filtering, sorting
- `src/lib/jobs` — dedupe, persistence, verification
- `src/lib/matching` — weighted compatibility scoring
- `src/lib/ai` — OpenAI client, resume parsing, job analysis, query generation, assistant, documents
- `src/lib/resume` — PDF/DOCX/TXT text extraction
- `src/inngest` — scheduled/background functions
- `src/supabase/migrations` — schema + RLS
- `src/tests/unit` — vitest unit tests
- `docs/API.md` — API reference
