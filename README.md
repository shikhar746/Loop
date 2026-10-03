# LOOP: AI customer-feedback intelligence

LOOP collects customer feedback (support tickets, app reviews, NPS, sales notes, community posts) and uses AI to
make sense of it:

- **Auto-classification:** sentiment, themes and feature area for every item
- **Themes & trends:** growing themes, with alerts when one spikes
- **Ask LOOP:** plain-English questions answered with citations to the exact feedback
- **Voice-of-Customer reports:** leadership-ready summaries you can print or share by link

Each company gets its own isolated workspace, with Admin, Analyst and Viewer roles.

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind · Prisma + Supabase Postgres (pgvector) · NextAuth ·
Claude or Gemini · Voyage AI embeddings · Vercel

> The Claude integration is fully built. The live demo runs on Gemini's free tier because Anthropic API credits
> are paid. To switch back, set `AI_PROVIDER=anthropic` and `ANTHROPIC_API_KEY`.

## Getting started

```bash
npm install
cp .env.example .env      # fill in every value; the app won't start with placeholders left in
npm run db:migrate        # tables, pgvector, search indexes
npm run seed              # demo workspaces with sample feedback
npm run backfill          # classify + embed the sample feedback
npm run dev               # http://localhost:3000
```

Demo logins: `admin@loop.demo`, `analyst@loop.demo`, `viewer@loop.demo`, all using the password you set in
`SEED_DEMO_PASSWORD`.

**Google sign-in (optional):** create an OAuth client in Google Cloud Console with the redirect URI
`<NEXTAUTH_URL>/api/auth/callback/google`, then set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

## Roles

| | Viewer | Analyst | Admin |
|---|:-:|:-:|:-:|
| View dashboards, Ask LOOP | ✓ | ✓ | ✓ |
| Add/edit feedback, manage themes, create and share reports | | ✓ | ✓ |
| Manage members, delete themes and reports | | | ✓ |

## Checks

```bash
npm run check   # typecheck + lint + unit tests (no DB or network needed)
npm run smoke   # end-to-end checks against a running, seeded server
```

## Project layout

- `app/api/**`: thin route handlers (validate → check role → call service)
- `lib/services/*`: all business logic, always scoped to a workspace
- `lib/ai.ts`: prompts and AI calls (Claude or Gemini), validated with Zod
- `prisma/`: schema, migrations, seed data
