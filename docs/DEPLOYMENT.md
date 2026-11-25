# StackScout AI — Production Deployment Guide

## Prerequisites

- [ ] Neon PostgreSQL database (or any PostgreSQL provider)
- [ ] Vercel account (or any Next.js host)
- [ ] Google Cloud Console project (for OAuth)
- [ ] Upstash Redis account (for distributed rate limiting)
- [ ] Inngest account (for background jobs)
- [ ] SMTP provider (Gmail, Brevo, etc.)
- [ ] AI provider API key (OpenAI, Gemini, etc.)
- [ ] Job provider API keys (optional, for more coverage)

## 1. Database Setup

### Neon (Recommended)

1. Create account at [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string
4. Set `DATABASE_URL` in your environment

### Run Migrations

```bash
# Local development
pnpm prisma db push

# Production (use production DATABASE_URL)
DATABASE_URL="your-prod-url" pnpm prisma db push
```

## 2. Vercel Deployment

### Option A: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Option B: Git Integration

1. Push your code to GitHub/GitLab
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project" → Import your repo
4. Configure environment variables (see below)
5. Deploy

### Environment Variables

Set these in Vercel Dashboard → Project → Settings → Environment Variables:

**Required:**
```
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>
NEXTAUTH_URL=https://yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com
BLOB_READ_WRITE_TOKEN=<vercel-blob-token>
GOOGLE_CLIENT_ID=<google-oauth-client-id>
GOOGLE_CLIENT_SECRET=<google-oauth-client-secret>
OPENAI_API_KEY=<your-ai-key>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=StackScout AI <your-email@gmail.com>
```

**Recommended:**
```
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
INNGEST_EVENT_KEY=...
INNGEST_SIGNING_KEY=...
```

**Optional (job providers):**
```
ADZUNA_APP_ID=...
ADZUNA_API_KEY=...
JOOBLE_API_KEY=...
TAVILY_API_KEY=...
USAJOBS_API_KEY=...
REED_API_KEY=...
CAREERJET_AFFID=...
DICE_API_KEY=...
GREENHOUSE_BOARD_TOKENS=company1,company2
LEVER_COMPANY_SLUGS=company1,company2
```

## 3. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create/select a project
3. Enable "Google+ API" and "Google OAuth2 API"
4. Create OAuth 2.0 credentials (Web application)
5. Add authorized redirect URIs:
   - `https://yourdomain.com/api/auth/callback/google`
   - `http://localhost:3000/api/auth/callback/google` (for local dev)
6. Copy Client ID and Client Secret to env vars

## 4. Vercel Blob Setup

1. In Vercel Dashboard → Storage → Create Blob store
2. Copy the `BLOB_READ_WRITE_TOKEN`
3. Set in environment variables

## 5. Upstash Redis Setup

1. Go to [upstash.com](https://upstash.com)
2. Create a Redis database
3. Copy REST URL and Token
4. Set in environment variables

## 6. Inngest Setup

1. Go to [inngest.com](https://inngest.com)
2. Create an app
3. Copy Event Key and Signing Key
4. Set in environment variables
5. Deploy your app — Inngest will auto-discover `/api/inngest` endpoint

## 7. SMTP Setup

### Gmail (Free)

1. Enable 2-Step Verification on your Google account
2. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Generate an App Password
4. Use:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-16-char-app-password
   ```

### Brevo (Free tier)

1. Sign up at [brevo.com](https://brevo.com)
2. Go to SMTP & API → SMTP
3. Generate SMTP key
4. Use:
   ```
   SMTP_HOST=smtp-relay.brevo.com
   SMTP_PORT=587
   SMTP_USER=your-login
   SMTP_PASS=your-smtp-key
   ```

## 8. Post-Deployment Checklist

- [ ] Visit `https://yourdomain.com` — landing page loads
- [ ] Sign up with email — verification email received
- [ ] Sign in with Google — OAuth works
- [ ] Upload resume — file stored in Blob
- [ ] Run job search — results return
- [ ] Check `/api/health` — returns healthy status
- [ ] Test auto-apply on a job — package generated
- [ ] Verify rate limiting works (try multiple requests)

## 9. Monitoring

### Health Check

```bash
curl https://yourdomain.com/api/health
```

### Logs

- Vercel Dashboard → Deployments → Functions → Logs
- Inngest Dashboard → Runs → Logs

### Common Issues

| Issue | Solution |
|-------|----------|
| `P1001: Can't reach database` | Check `DATABASE_URL`, ensure Neon is awake |
| `NEXTAUTH_SECRET` error | Generate new secret, update env var |
| `BLOB_READ_WRITE_TOKEN` missing | Create Blob store in Vercel |
| Emails not sending | Check SMTP credentials, check spam folder |
| Jobs not loading | Check provider API keys, check rate limits |
| OAuth redirect error | Verify redirect URI in Google Console |

## 10. Scaling

- **Database**: Neon auto-scales, upgrade plan if needed
- **Rate limiting**: Upstash Redis handles distributed limits
- **Background jobs**: Inngest handles retries and scheduling
- **Storage**: Vercel Blob scales automatically
- **AI**: Monitor API usage, upgrade tier if needed
