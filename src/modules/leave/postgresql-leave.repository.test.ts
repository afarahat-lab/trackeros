import { describe, expect, it, vi, beforeEach } from "vitest";
import pool from "../../shared/db/connection";
import { PostgreSqlLeaveRequestRepository } from "./postgresql-leave.repository";
import type { LeaveRequest } from "./leave.model";

vi.mock("../../shared/db/connection", () => ({
  default: {
    query: vi.fn()
  }
}));

const sample: LeaveRequest = {
  id: "1",
  employeeId: "emp-1",
  leaveType: "ANNUAL",
  startDate: new Date("2025-01-01"),
  endDate: new Date("2025-01-02"),
  status: "PENDING",
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01")
};

describe("PostgreSqlLeaveRequestRepository", () => {
  const repository = new PostgreSqlLeaveRequestRepository();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates and retrieves leave requests", async () => {
    vi.mocked(pool.query).mockResolvedValueOnce({ rows: [{
      id: sample.id,
      employee_id: sample.employeeId,
      leave_type: sample.leaveType,
      start_date: sample.startDate,
      end_date: sample.endDate,
      status: sample.status,
      created_at: sample.createdAt,
      updated_at: sample.updatedAt
    }] } as never);

    const created = await repository.create(sample);
    expect(created.id).toBe(sample.id);
  });

  it("retrieves leave requests by employeeId", async () => {
    vi.mocked(pool.query).mockResolvedValueOnce({ rows: [{
      id: sample.id,
      employee_id: sample.employeeId,
      leave_type: sample.leaveType,
      start_date: sample.startDate,
      end_date: sample.endDate,
      status: sample.status,
      created_at: sample.createdAt,
      updated_at: sample.updatedAt
    }] } as never);

    const results = await repository.findByEmployeeId(sample.employeeId);
    expect(results).toHaveLength(1);
  });

  it("updates leave requests", async () => {
    vi.mocked(pool.query).mockResolvedValueOnce({ rows: [{
      id: sample.id,
      employee_id: sample.employeeId,
      leave_type: sample.leaveType,
      start_date: sample.startDate,
      end_date: sample.endDate,
      status: "APPROVED",
      created_at: sample.createdAt,
      updated_at: sample.updatedAt
    }] } as never);

    const updated = await repository.update({ ...sample, status: "APPROVED" });
    expect(updated.status).toBe("APPROVED");
  });

  it("findById returns matching request", async () => {
    vi.mocked(pool.query).mockResolvedValueOnce({ rows: [{
      id: sample.id,
      employee_id: sample.employeeId,
      leave_type: sample.leaveType,
      start_date: sample.startDate,
      end_date: sample.endDate,
      status: sample.status,
      created_at: sample.createdAt,
      updated_at: sample.updatedAt
    }] } as never);

    const found = await repository.findById(sample.id);
    expect(found?.id).toBe(sample.id);
  });
}
);