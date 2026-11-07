# StackScout AI

**Discover the right opportunity. Let AI find your next career move.**

StackScout AI is an AI-powered job discovery, career intelligence, and application management SaaS. Upload a resume for AI-generated matching, or search manually across multiple job providers — no resume required.

## Features

- **AI Resume Intelligence** — PDF/DOCX/TXT parsing into a structured, editable candidate profile (skills with professional evidence, experience, education, projects)
- **Multi-source Job Discovery** — Tavily, Adzuna, Jooble, Greenhouse, Lever adapters behind a common interface, with normalization, deduplication, and source attribution
- **Manual Job Search** — titles, keywords, tech, skills, company, location, salary, employment type, remote status, experience level, date posted; natural-language queries ("remote React jobs paying $80k from Nigeria")
- **Evidence-based Matching** — deterministic weighted scoring (tech 35%, experience 25%, responsibilities 15%, seniority 10%, location 10%, industry 5%) with matching/missing skills and honest explanations
- **AI Career Assistant** — profile-aware chat for job advice, interview prep, summaries, cover letters, and resume tailoring
- **Application Tracker** — 11-stage pipeline, Kanban board + table views, events timeline, notes
- **Job Alerts** — saved searches with scheduled background processing via Inngest
- **Career Insights** — skills demand, salary, remote trends computed only from your discovered-jobs dataset (with disclaimers)
- **Admin Dashboard** — users, roles, provider health, sync logs, failed resumes
- **Light & dark themes**, fully responsive, WCAG-conscious markup

## Quick start

```bash
pnpm install
cp env.example .env.local   # fill in Supabase + API keys
pnpm dev
```

See **[docs/SETUP.md](docs/SETUP.md)** for complete setup: Supabase project, migrations, API keys, Inngest, tests, and Vercel deployment.

API reference: **[docs/API.md](docs/API.md)**

## Scripts

| Command                  | Purpose                    |
| ------------------------ | -------------------------- |
| `pnpm dev`               | Development server         |
| `pnpm build`             | Production build           |
| `pnpm lint`              | ESLint                     |
| `pnpm exec tsc --noEmit` | Type check                 |
| `pnpm test`              | Vitest unit tests          |
| `pnpm test:e2e`          | Playwright (specs pending) |

## Stack

Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui-style components · Supabase (Postgres + Auth + Storage + pgvector + RLS) · OpenAI · Inngest · Vercel

## Honest-data policy

- No invented vacancies, salaries, customers, or statistics.
- Without provider API keys, search returns clearly-badged **demo** listings only.
- Missing job/candidate data is treated as _unknown_, never assumed.
