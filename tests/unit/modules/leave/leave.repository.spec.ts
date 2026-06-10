import { describe, expect, it, vi } from "vitest";
import { PostgresLeaveRepository } from "../../../../src/modules/leave/postgres-leave.repository";
import type { LeaveRequest } from "../../../../src/modules/leave/leave.model";

describe("PostgresLeaveRepository", () => {
  const leaveRequest: LeaveRequest = {
    id: "leave-1",
    employeeId: "employee-1",
    leaveType: "ANNUAL",
    startDate: new Date("2025-01-01"),
    endDate: new Date("2025-01-05"),
    status: "PENDING",
    approverEmployeeId: null,
    createdAt: new Date("2025-01-01T00:00:00.000Z"),
  };

  it("creates a leave request", async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [{
        id: leaveRequest.id,
        employee_id: leaveRequest.employeeId,
        leave_type: leaveRequest.leaveType,
        start_date: leaveRequest.startDate,
        end_date: leaveRequest.endDate,
        status: leaveRequest.status,
        approver_employee_id: leaveRequest.approverEmployeeId,
        created_at: leaveRequest.createdAt,
      }],
    });

    const repository = new PostgresLeaveRepository({ query } as never);
    await expect(repository.create(leaveRequest)).resolves.toMatchObject({ id: "leave-1" });
  });

  it("finds by id", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const repository = new PostgresLeaveRepository({ query } as never);

    await expect(repository.findById("missing")).resolves.toBeNull();
  });

  it("lists by employee id", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const repository = new PostgresLeaveRepository({ query } as never);

    await expect(repository.findByEmployeeId("employee-1")).resolves.toEqual([]);
  });
});
