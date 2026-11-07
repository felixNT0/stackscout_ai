# StackScout AI — Implementation Checklist

## Foundation
- [x] Next.js App Router + TypeScript strict
- [x] Tailwind v4 + design tokens + shadcn-style UI kit
- [x] Light/dark/system theme, persisted, no-flash
- [x] Responsive layout (desktop sidebar / mobile drawer)
- [x] Prisma client (DATABASE_URL) + Supabase browser/server auth clients
- [x] API helpers: auth guard, zod parsing, error envelope, rate limit

## Auth & Users
- [x] Sign up / sign in / sign out / password reset / OAuth hook
- [x] Protected dashboard (middleware + layout guard)
- [x] Profile & career preferences CRUD
- [x] Settings (notifications, privacy, appearance, account deletion)
- [ ] Email verification flow polish (Supabase-managed; UI relies on provider emails)

## Resume Intelligence
- [x] Upload (PDF/DOCX/TXT, size/type validation, private bucket)
- [x] Text extraction
- [x] AI structured parsing → profile/skills/experience/education/projects
- [x] Professional-vs-listed skill distinction (`is_professional`)
- [x] Profile review & edit UI
- [x] Multiple resumes + delete

## Job Discovery
- [x] Provider interface + Tavily/Adzuna/Jooble/Greenhouse/Lever adapters
- [x] Demo provider (clearly labelled, never confused with real data)
- [x] Normalization + dedupe (fingerprint + URL) + source tracing
- [x] Filters, sorting, pagination, list/grid views
- [x] NL search → structured params (AI + fallback)
- [x] Saved searches, provider status surfacing
- [x] Job verification endpoint (conservative expiry)

## AI
- [x] Weighted match scoring + explanations + categories
- [x] Query generation from profile
- [x] Job description analysis
- [x] Career assistant (persistent conversations)
- [x] Cover letter / tailored resume / summary / match explanation
- [x] Prompt-injection guard on untrusted resume/JD text

## Applications
- [x] Saved jobs
- [x] Application tracker (11 statuses)
- [x] Kanban board + table view
- [x] Events timeline, notes, reminders fields

## Automation
- [x] Inngest functions (daily discovery, on-demand, weekly expiry, alert processor)
- [x] Search alerts CRUD
- [x] In-app notifications + bell UI
- [ ] Email notifications via Resend (env ready; sending not wired)
- [ ] Browser push notifications

## Admin
- [x] Admin dashboard (stats, users, roles, sources, sync logs, failed resumes)
- [x] Server-side RBAC + RLS policies
- [ ] Audit log UI surface (table + writes exist)

## Quality
- [x] TypeScript strict — clean
- [x] ESLint — 0 errors
- [x] Production build — passes (54 routes)
- [x] Unit tests — 20 passing (dedupe, matching, providers)
- [ ] Integration/API tests
- [ ] Playwright e2e tests
- [ ] Formal WCAG audit

## Docs & Deploy
- [x] `.env.example` / `env.example` with all keys documented
- [x] `docs/SETUP.md` — install, Supabase, keys, migrations, deploy
- [x] `docs/API.md` — endpoint reference
- [x] `DEVELOPMENT_PROGRESS.md`, `IMPLEMENTATION_CHECKLIST.md`
- [ ] Live deployment + domain + production verification
