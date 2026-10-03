import "server-only";
import { z } from "zod";

// Values copied from .env.example that were never filled in.
const PLACEHOLDER = /REPLACE|YOUR_/;

export const AI_PROVIDERS = ["anthropic", "gemini"] as const;

const envSchema = z.object({
  DATABASE_URL: z.string().startsWith("postgres", "must be a postgresql:// connection string"),
  DIRECT_URL: z.string().startsWith("postgres", "must be a postgresql:// connection string"),
  NEXTAUTH_SECRET: z.string().min(32, "must be at least 32 characters (openssl rand -base64 32)"),
  NEXTAUTH_URL: z.url("must be a full URL such as http://localhost:3000").optional(),
  // Which LLM backs classification, Ask LOOP and reports.
  AI_PROVIDER: z.enum(AI_PROVIDERS).default("anthropic"),
  ANTHROPIC_API_KEY: z.string().startsWith("sk-ant-", "must start with sk-ant-").optional(),
  ANTHROPIC_MODEL: z.string().min(1).default("claude-sonnet-4-6"),
  GEMINI_API_KEY: z.string().min(1).optional(),
  GEMINI_MODEL: z.string().min(1).default("gemini-3.5-flash-lite"),
  // Parallel LLM calls per batch. Keep low on free tiers with small requests-per-minute limits.
  AI_CONCURRENCY: z.coerce.number().int().min(1).max(8).default(8),
  VOYAGE_API_KEY: z.string().min(1),
  EMBEDDING_MODEL: z.string().min(1).default("voyage-3.5-lite"),
  EMBEDDING_DIMENSIONS: z.coerce
    .number()
    .int()
    .refine((n) => n === 1024, "must be 1024 to match vector(1024) in prisma/schema.prisma")
    .default(1024),
});

export type Env = z.infer<typeof envSchema>;

const ALWAYS_REQUIRED = ["DATABASE_URL", "DIRECT_URL", "NEXTAUTH_SECRET", "VOYAGE_API_KEY"] as const;
const PROVIDER_KEY = { anthropic: "ANTHROPIC_API_KEY", gemini: "GEMINI_API_KEY" } as const;

/** Lists every missing/placeholder/malformed variable at once so a single fix pass is enough. */
export function readEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const provider = (AI_PROVIDERS as readonly string[]).includes(source.AI_PROVIDER ?? "")
    ? (source.AI_PROVIDER as (typeof AI_PROVIDERS)[number])
    : "anthropic";
  const required = [...ALWAYS_REQUIRED, PROVIDER_KEY[provider]];

  // Placeholders in keys the active provider doesn't use are treated as unset, not as errors.
  const cleaned: NodeJS.ProcessEnv = { ...source };
  const problems = new Map<string, string>();
  for (const key of Object.keys(envSchema.shape)) {
    const value = source[key];
    if (value && PLACEHOLDER.test(value)) {
      if ((required as string[]).includes(key)) {
        problems.set(key, "still contains a placeholder (REPLACE / YOUR_) from .env.example");
      } else {
        delete cleaned[key];
      }
    }
  }
  for (const key of required) {
    if (!source[key]?.trim()) problems.set(key, `is missing${key === PROVIDER_KEY[provider] ? ` (required when AI_PROVIDER=${provider})` : ""}`);
  }

  const parsed = envSchema.safeParse(cleaned);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "env");
      if (!problems.has(key)) problems.set(key, issue.message);
    }
  }

  if (problems.size > 0 || !parsed.success) {
    const lines = [...problems].map(([key, msg]) => `  - ${key} ${msg}`).join("\n");
    throw new Error(
      `LOOP cannot start: invalid environment configuration.\n${lines}\n` +
        "Fix these in .env (locally) or in Vercel → Settings → Environment Variables. See .env.example.",
    );
  }
  return parsed.data;
}

export const env = readEnv();
