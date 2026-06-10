CREATE TABLE leave_requests (
  id UUID PRIMARY KEY,
  employee_id UUID NOT NULL,
  leave_type VARCHAR(20) NOT NULL CHECK (leave_type IN ('ANNUAL','SICK','EMERGENCY')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING','APPROVED','REJECTED')),
  approver_employee_id UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leave_requests_employee_id ON leave_requests(employee_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);
