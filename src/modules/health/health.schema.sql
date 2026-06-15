CREATE TABLE health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status VARCHAR(20) NOT NULL CHECK (status IN ('REQUESTED', 'PROCESSING', 'COMPLETED', 'FAILED')),
  response_time INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_health_checks_timestamp ON health_checks(timestamp);
CREATE INDEX idx_health_checks_status ON health_checks(status);
