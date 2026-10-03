-- Hand-written (create-only) migration: indexes Prisma's schema language can't express.

-- Approximate nearest-neighbour search for Ask LOOP (queries ORDER BY "vector" <=> $1::vector).
CREATE INDEX IF NOT EXISTS "Embedding_vector_hnsw_idx"
  ON "Embedding" USING hnsw ("vector" vector_cosine_ops);

-- Full-text search for GET /api/feedback?q=... (to_tsvector('english', content) @@ websearch_to_tsquery(...)).
CREATE INDEX IF NOT EXISTS "Feedback_content_fts_idx"
  ON "Feedback" USING gin (to_tsvector('english', "content"));
