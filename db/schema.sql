CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes integer NOT NULL CHECK (size_bytes >= 0),
  content_hash text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'failed')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL,
  content text NOT NULL,
  token_estimate integer NOT NULL,
  page_number integer,
  embedding vector(1536) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS chunks_embedding_hnsw
  ON chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS chunks_document_id_idx ON chunks(document_id);

CREATE TABLE IF NOT EXISTS responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text,
  model text NOT NULL,
  source_ids uuid[] NOT NULL DEFAULT '{}',
  latency_ms integer,
  status text NOT NULL DEFAULT 'streaming' CHECK (status IN ('streaming', 'complete', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id uuid REFERENCES responses(id) ON DELETE CASCADE,
  groundedness numeric(4,3) NOT NULL,
  citation_coverage numeric(4,3) NOT NULL,
  answer_relevance numeric(4,3) NOT NULL,
  overall numeric(4,3) NOT NULL,
  verdict text NOT NULL CHECK (verdict IN ('strong', 'review', 'weak')),
  notes jsonb NOT NULL DEFAULT '[]',
  method text NOT NULL CHECK (method IN ('model', 'heuristic')),
  created_at timestamptz NOT NULL DEFAULT now()
);
