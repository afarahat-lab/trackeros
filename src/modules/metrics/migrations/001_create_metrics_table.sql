CREATE TABLE IF NOT EXISTS metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(255) NOT NULL,
  value INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_metrics_key UNIQUE (key)
);

CREATE INDEX IF NOT EXISTS idx_metrics_key ON metrics (key);

INSERT INTO metrics (key, value) VALUES ('request_count', 0) ON CONFLICT (key) DO NOTHING;
