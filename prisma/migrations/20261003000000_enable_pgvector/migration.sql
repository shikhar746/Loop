-- Hand-written (create-only) migration: must run before "init" because "Embedding"."vector" uses the vector type.
-- Supabase ships pgvector; this just enables it for the database.
CREATE EXTENSION IF NOT EXISTS vector;
