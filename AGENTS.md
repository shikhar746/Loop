# LOOP: agent notes

LOOP is a multi-tenant AI customer-feedback intelligence platform.

## Stack (locked; don't substitute)
- Next.js 14.2 (App Router) + TypeScript strict + React 18.3, Tailwind CSS 3.4
- PostgreSQL on Supabase (used only as a Postgres host) via Prisma 6, with pgvector
- NextAuth v4 (Credentials provider + optional Google provider, JWT sessions), bcryptjs. Google users are mapped
  onto LOOP users by verified email in the `jwt` callback (`findOrCreateGoogleUser`); no adapter, no schema change.
- LLM: `AI_PROVIDER=anthropic` (Claude via @anthropic-ai/sdk) or `gemini` (Gemini REST via fetch, free tier,
  used for the demo since API credits are paid). Same prompts/schemas/validation in `lib/ai.ts`.
- Voyage AI embeddings via fetch
- Zod at every API boundary, Recharts on the frontend, deployed on Vercel

## Next 14 rules
- Route handler params are plain objects: `{ params }: { params: { id: string } }`.
- Page auth redirects live in `middleware.ts` (Edge runtime): never import Prisma, bcrypt or `lib/*` server modules there.
- There is no `after()`; do work inline or via the process-pending endpoint.
- Config is `next.config.mjs` (Next 14 doesn't read a TS config); ESLint uses `.eslintrc.json`.

## Code layout
- `app/api/**/route.ts` stays thin: parse (Zod) → guard → service → respond, wrapped in `withHandler`.
- All business logic is in `lib/services/*`. Every service function takes `workspaceId` first; tenant rows are
  looked up with `findFirst({ where: { id, workspaceId } })`, and every raw SQL query filters on `"workspaceId"`.
- Modules that touch secrets or the DB start with `import "server-only"`. Scripts run with
  `tsx --conditions=react-server` so those imports resolve.
- No `any`.

## Migrations gotcha
Prisma can't model HNSW indexes, so any future `prisma migrate dev` will generate
`DROP INDEX "Embedding_vector_hnsw_idx";`. Always create migrations with `--create-only` and delete that
line before applying. (The full-text GIN index is an expression index, which Prisma ignores.)
