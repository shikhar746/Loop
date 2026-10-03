# LOOP: AI customer-feedback intelligence

Multi-tenant platform that ingests customer feedback (support tickets, app reviews, NPS, sales notes, community),
classifies it with Claude (sentiment, themes, feature area), tracks theme trends and spikes, answers questions
grounded in the feedback ("Ask LOOP"), and writes Voice-of-Customer reports.

**Stack:** Next.js 14.2 (App Router) · TypeScript · Tailwind 3.4 · Prisma 6 on Supabase Postgres + pgvector ·
NextAuth v4 (credentials, JWT) · Claude (`@anthropic-ai/sdk`) or Gemini · Voyage AI embeddings · Zod · Recharts · Vercel.

> **LLM provider note.** The brief specifies Claude, and the Claude integration is fully implemented in `lib/ai.ts`
> (forced `tool_choice`, Zod-validated). Because Anthropic API credits are paid, the deployed demo runs on
> **Google Gemini's free tier** (`AI_PROVIDER=gemini`, model `gemini-3.5-flash-lite`) through the same prompts,
> tool schemas and validation. Switching back is one env change: `AI_PROVIDER=anthropic` + `ANTHROPIC_API_KEY`.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env` and fill in every value (the app refuses to start while any placeholder remains):
   - Supabase → **Connect → ORMs → Prisma**: transaction pooler (6543) → `DATABASE_URL`, session pooler (5432) → `DIRECT_URL`
   - `openssl rand -base64 32` → `NEXTAUTH_SECRET`
   - Anthropic and Voyage API keys, and a demo password for `SEED_DEMO_PASSWORD`
3. `npm run db:migrate`: enables pgvector, creates tables, and adds the HNSW + full-text indexes
4. `npm run seed`: demo workspaces "Acme Analytics" (150 items) and "Globex" (10 items), all PENDING
5. `npm run backfill`: classifies + embeds every PENDING item (batches of 8)
6. `npm run dev`

Demo logins (password = `SEED_DEMO_PASSWORD`): `admin@loop.demo`, `analyst@loop.demo`, `viewer@loop.demo`,
`admin@globex.demo`.

## Scripts

| Script | What it does |
|---|---|
| `npm run db:migrate` | `prisma migrate deploy` (no shadow DB needed) |
| `npm run seed` | Idempotent demo data |
| `npm run backfill` | Classify + embed all PENDING/FAILED feedback |
| `npm run smoke` | 28 end-to-end checks against a running server: auth, roles, tenant isolation, validation (no AI calls) |
| `npm run typecheck` / `npm run lint` | Static checks |

`requests.http` covers every endpoint, including the isolation checks (VS Code REST Client).

## Architecture

- `app/api/**/route.ts`: thin handlers: Zod parse → `requireSession`/`requireRole` → service → JSON.
- `lib/services/*`: all business logic; every function takes `workspaceId` first.
- `lib/guards.ts`: session from the JWT, then the user is re-read from the DB on each request.
- `lib/http.ts`: `withHandler` maps errors to `{ error: { code, message, details? } }`.
- `lib/ai.ts`: Claude calls with forced tool use + Zod validation (one retry); prompts are documented constants.
- `lib/search.ts`: Voyage embeddings + pgvector cosine search, always filtered by workspace.
- `middleware.ts`: JWT-only page protection (Edge); API routes enforce auth themselves.

## Roles

| | VIEWER | ANALYST | ADMIN |
|---|---|---|---|
| Read everything, Ask LOOP | ✓ | ✓ | ✓ |
| Ingest / edit / classify feedback, manage themes, generate + share reports | | ✓ | ✓ |
| Members, delete themes and reports | | | ✓ |
