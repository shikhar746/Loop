import "server-only";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "./db";
import { env } from "./env";
import { aiUnavailable } from "./http";

const VOYAGE_URL = "https://api.voyageai.com/v1/embeddings";
export const EMBED_BATCH_SIZE = 8;
/** Matches below this cosine similarity are treated as unrelated to the question. */
export const MIN_SIMILARITY = 0.3;
export const ASK_TOP_K = 12;

const voyageResponseSchema = z.object({
  data: z.array(z.object({ embedding: z.array(z.number()), index: z.number().int() })),
});

type InputType = "document" | "query";

async function embedBatch(texts: string[], inputType: InputType): Promise<number[][]> {
  let res: Response;
  try {
    res = await fetch(VOYAGE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.VOYAGE_API_KEY}` },
      body: JSON.stringify({
        model: env.EMBEDDING_MODEL,
        input: texts,
        input_type: inputType,
        output_dimension: env.EMBEDDING_DIMENSIONS,
      }),
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
  } catch (err) {
    console.error("[embeddings] Voyage request failed:", err instanceof Error ? err.message : "unknown error");
    throw aiUnavailable("The embedding service is unavailable right now. Please try again shortly.");
  }
  if (!res.ok) {
    console.error(`[embeddings] Voyage returned status=${res.status}`);
    throw aiUnavailable("The embedding service is unavailable right now. Please try again shortly.");
  }
  const parsed = voyageResponseSchema.safeParse(await res.json());
  if (!parsed.success || parsed.data.data.length !== texts.length) {
    console.error("[embeddings] unexpected Voyage response shape");
    throw aiUnavailable("The embedding service returned an unexpected response.");
  }
  const vectors = [...parsed.data.data].sort((a, b) => a.index - b.index).map((d) => d.embedding);
  if (vectors.some((v) => v.length !== env.EMBEDDING_DIMENSIONS)) {
    console.error("[embeddings] dimension mismatch from Voyage");
    throw aiUnavailable("The embedding service returned vectors of the wrong size.");
  }
  return vectors;
}

/** Embeds texts in batches of up to 8 per Voyage call. */
export async function embedTexts(texts: string[], inputType: InputType): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += EMBED_BATCH_SIZE) {
    out.push(...(await embedBatch(texts.slice(i, i + EMBED_BATCH_SIZE), inputType)));
  }
  return out;
}

export async function embedQuery(text: string): Promise<number[]> {
  const [vector] = await embedBatch([text], "query");
  return vector;
}

function toVectorLiteral(vector: number[]): string {
  return `[${vector.map((n) => (Number.isFinite(n) ? n : 0)).join(",")}]`;
}

/**
 * Upserts the embedding for one feedback row. The INSERT ... SELECT only matches a feedback row
 * inside the given workspace, so a foreign id writes nothing.
 */
export async function storeEmbedding(workspaceId: string, feedbackId: string, vector: number[]): Promise<boolean> {
  const written = await db.$executeRaw`
    INSERT INTO "Embedding" ("id", "feedbackId", "workspaceId", "vector", "model", "createdAt")
    SELECT gen_random_uuid()::text, f."id", f."workspaceId", ${toVectorLiteral(vector)}::vector, ${env.EMBEDDING_MODEL}, NOW()
    FROM "Feedback" f
    WHERE f."id" = ${feedbackId} AND f."workspaceId" = ${workspaceId}
    ON CONFLICT ("feedbackId") DO UPDATE
      SET "vector" = EXCLUDED."vector", "model" = EXCLUDED."model", "createdAt" = NOW()`;
  return written > 0;
}

export type SimilarFeedback = {
  id: string;
  content: string;
  channel: string;
  customerLabel: string | null;
  createdAt: Date;
  similarity: number;
};

/** Top-k nearest feedback in one workspace by cosine distance, dropping weak matches. */
export async function searchSimilarFeedback(
  workspaceId: string,
  queryVector: number[],
  limit = ASK_TOP_K,
  minSimilarity = MIN_SIMILARITY,
): Promise<SimilarFeedback[]> {
  const vec = toVectorLiteral(queryVector);
  const rows = await db.$queryRaw<SimilarFeedback[]>(Prisma.sql`
    SELECT f."id", f."content", f."channel"::text AS "channel", f."customerLabel", f."createdAt",
           (1 - (e."vector" <=> ${vec}::vector))::float8 AS "similarity"
    FROM "Embedding" e
    JOIN "Feedback" f ON f."id" = e."feedbackId"
    WHERE e."workspaceId" = ${workspaceId} AND f."workspaceId" = ${workspaceId}
    ORDER BY e."vector" <=> ${vec}::vector
    LIMIT ${limit}`);
  return rows.filter((r) => r.similarity >= minSimilarity);
}
