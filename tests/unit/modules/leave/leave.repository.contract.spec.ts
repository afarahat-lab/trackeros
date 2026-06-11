import { describe, expect, it } from "vitest";

import {
  LeaveRequest,
  LeaveRequestStatus,
  LeaveType,
} from "../../../../src/modules/leave/leave.model";
import {
  LeaveRequestRepository,
  PgLeaveRequestRepository,
} from "../../../../src/modules/leave/leave.repository";

describe("leave repository contracts", () => {
  it("supports LeaveRequest type definitions", () => {
    const leaveType: LeaveType = "ANNUAL";
    const status: LeaveRequestStatus = "PENDING";

    const request: LeaveRequest = {
      id: "leave-id",
      employeeId: "employee-id",
      leaveType,
      status,
    };

    expect(request.leaveType).toBe("ANNUAL");
    expect(request.status).toBe("PENDING");
  });

  it("exposes repository contracts", () => {
    const repository: LeaveRequestRepository = new PgLeaveRequestRepository();

    expect(repository).toBeInstanceOf(PgLeaveRequestRepository);
  });
});