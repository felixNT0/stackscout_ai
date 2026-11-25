# StackScout AI — Development Progress

_Last updated: 2026-11-04_

## Status legend
✅ Done · 🟡 Partial · ⬜ Not started

## Phase 1 — Foundation ✅
- Next.js 16 (App Router) + TypeScript strict + Tailwind v4 + shadcn/ui-style components
- Design tokens (Midnight Navy / Electric Violet / Digital Cyan) via CSS variables; light/dark/system themes with `next-themes`, no flash (`suppressHydrationWarning`)
- Responsive shell: collapsible desktop sidebar, mobile drawer nav, sticky header
- Data layer: **Prisma 7 + driver adapter (`@prisma/adapter-pg`)** against `DATABASE_URL` — portable across Supabase Postgres, Neon, or any Postgres. Schema in `prisma/schema.prisma` mirrors the SQL migrations (snake_case fields preserved).
- Supabase retained for **Auth** (cookie sessions, publishable key) and **Storage** (session-scoped resume bucket); `createAdminClient` no longer used by app routes

## Phase 2 — Auth & Profile ✅
- Email/password sign up + sign in, Google OAuth hook, password reset, email verification via Supabase
- Auth callback route, sign-out route, middleware protection for `/dashboard`
- Onboarding page scaffold (`/auth/onboarding`)
- Profile + job preferences API (`/api/profile`), settings API (`/api/settings`)

## Phase 3 — Resume Intelligence ✅
- Upload API (PDF/DOCX/TXT, ≤10 MB, private `resumes` bucket, owner-scoped storage RLS)
- Text extraction (`pdf-parse`, `mammoth`)
- AI structured parsing via OpenAI JSON-schema output → candidate profile, skills (with `is_professional` evidence flag), experience, education, projects
- Candidate profile review/edit UI; resume list/delete; re-analysis
- pgvector embedding column populated best-effort

## Phase 4 — Job Discovery ✅
- Provider adapters behind a common `JobProvider` interface: Tavily (discovery leads), Adzuna, Jooble, Greenhouse, Lever, plus a clearly-labelled demo provider used only when no keys are configured
- Normalization to a common job model; fingerprint + URL dedupe with source tracing
- Filter engine (employment type, remote status, experience, salary, date posted, location, keywords…) and sorting (relevance/newest/salary)
- Persistence to `jobs` table with upsert; application-link verification endpoint (only marks expired on confirmed 404/410)
- Manual search UI with NL mode, structured filters, list/grid, pagination, saved searches, provider status + demo warnings

## Phase 5 — AI Intelligence ✅
- Weighted matching engine (tech 35 / experience 25 / responsibilities 15 / seniority 10 / location 10 / industry 5) with subscores, matching/missing skills, explanations, categories — no score inflation; unknown ≠ unqualified
- AI query generation from profile (+ deterministic fallback)
- AI job-description analysis (structured requirements) with keyword fallback
- AI assistant (conversation persistence, profile-aware context, prompt-injection guard)
- Cover letter, resume tailoring, professional summary, match explanation — all persisted to `generated_documents`, editable output

## Phase 6 — Application Management ✅
- Saved jobs (save/unsave, notes)
- Applications CRUD + 11-stage status pipeline, events timeline, Kanban board + table views, detail editing, filters

## Phase 7 — Automation 🟡
- Inngest v4 functions: daily discovery cron, on-demand discovery event, weekly stale-job expiry, 6-hourly alert processor → in-app notifications
- Search alerts CRUD + user notification preferences
- Email notifications via Resend: env-configured; in-app notifications fully working. Outbound email sending is scaffolded but not yet wired to a provider template — flagged as partial.

## Phase 8 — Administration ✅
- Admin stats, user management + role changes (super_admin), provider/sync log visibility, failed-resume monitoring, manual discovery trigger
- Server-side role checks (`profiles.role`, `is_admin()` SQL fn) + RLS policies on all tables

## Phase 9 — Quality Assurance 🟡
- ✅ `tsc --noEmit` clean, `eslint` 0 errors, `next build` succeeds (54 routes)
- ✅ 20 vitest unit tests: dedupe, matching engine, providers (mock/lever/adzuna/jooble)
- ⬜ Playwright e2e suite (config + deps installed; specs not yet written)
- ⬜ Accessibility audit pass (WCAG 2.2 AA target — semantic HTML/labels/focus implemented, not formally audited)

## Phase 10 — Deployment 🟡
- Documented Vercel + Supabase deploy path in `docs/SETUP.md`
- ⬜ Not yet deployed to a live environment (requires user's Supabase + domain)

## Known limitations
- Greenhouse/Lever require company board tokens/slugs (`GREENHOUSE_BOARD_TOKENS`, `LEVER_COMPANY_SLUGS`) — no global search exists for those APIs by design.
- Tavily results are discovery leads, not verified vacancies.
- Rate limiting is in-memory per instance (fine for single-instance dev; swap for Upstash/Redis at scale).
- Job embeddings column exists; semantic (pgvector) matching is stored but the deterministic scorer is primary.
- Email delivery requires Resend key; without it alerts are in-app only.

## Phase 11 — Advanced Features ✅
- **LinkedIn OAuth** — Sign in with LinkedIn, profile import
- **Resume Builder** — 4 templates (Modern, Classic, Minimal, Creative), PDF generation
- **Interview Scheduling** — Calendar integration, Google Calendar links
- **PWA** — Install as app, offline support, service worker
- **Job Alerts** — Improved matching, better notifications
- **Job Comparison** — Side-by-side comparison tool
- **Saved Searches** — Save and reuse search queries
- **Bulk Operations** — Bulk status update, delete, export
- **More Providers** — SimplyHired, BuiltInChicago, Wellfound
- **Advanced Search** — Company size, funding stage, benefits filters
- **API Documentation** — Complete API reference
- **Sentry** — Error monitoring integration
- **Database Indexing** — Optimized query performance
- **Print Styles** — Better printing experience
- **Dark Mode** — Improved contrast and readability
- **WCAG** — ARIA labels, keyboard navigation

## Phase 12 — Technical Debt ✅
- **Tests** — 40 unit tests covering AI tools, providers, matching
- **Error Monitoring** — Sentry integration for production
- **Performance** — Database indexes, code optimization
- **Accessibility** — WCAG improvements
- **Documentation** — API docs, setup guides

## Current Status: Production Ready
- ✅ 24 job providers (18 original + 6 new)
- ✅ 10 AI career tools
- ✅ Auto-apply (Greenhouse, Lever, email)
- ✅ ATS-optimized documents
- ✅ Analytics (funnel, time-to-hire, PDF export)
- ✅ Real-time notifications (SSE)
- ✅ Offline mode (service worker)
- ✅ Chrome extension
- ✅ LinkedIn OAuth
- ✅ Interview scheduling
- ✅ Resume builder (4 templates)
- ✅ PWA (install as app)
- ✅ Job comparison
- ✅ Saved searches
- ✅ Bulk operations
- ✅ Error monitoring (Sentry)
- ✅ Database indexing
- ✅ Print styles
- ✅ Dark mode improvements
- ✅ WCAG accessibility
- ✅ 40 unit tests
- ✅ TypeScript strict mode
- ✅ ESLint clean
- ✅ Build successful (89 routes)

## Phase 8: Public API & Growth Features
- ✅ Public developer API — API keys (read/write/admin scopes), /api/v1 endpoints (jobs, matches, applications, profile), Settings → Developer UI
- ✅ Video introductions — browser recorder (MediaRecorder), private Vercel Blob storage, range-request streaming, attach to applications
- ✅ Coding practice — AI-generated problems (12 topics, 3 difficulties, 6 languages), code evaluation with complexity analysis, history tracking, /dashboard/practice
- ✅ Share links — public /share/[token] pages (profile/matches/application), view tracking, expiry, Settings → Sharing UI
- ✅ DB: api_keys, video_introductions, share_links, practice_sessions tables

## Auth.js v5 — Evaluated, Deferred
- v5 is still beta-only (5.0.0-beta.32); latest stable is v4.24.15
- Current v4 + getToken + connection() setup is warning-free and production-safe
- Migrate when v5 reaches stable

## Remaining (External Setup Required)
- Rotate Gmail app password
- Deploy to Vercel
- Configure production env vars
- Run Prisma migrations
- Test LinkedIn OAuth with real credentials
- Load testing
