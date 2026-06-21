## Iteration 1 decision
```json
{
  "editFormat": "architect",
  "readPaths": [
    "src/modules/leave-management/leave-management.service.ts",
    "src/modules/leave/leave.model.ts",
    "src/modules/leave/leave.repository.ts",
    "src/modules/balance/balance.model.ts",
    "src/modules/balance/balance.repository.ts",
    "src/modules/employee/employee.model.ts",
    "src/modules/employee/employee.repository.ts",
    "src/modules/audit/audit.model.ts",
    "src/modules/audit/audit.repository.ts",
    "src/modules/notification/notification.model.ts",
    "src/modules/notification/notification.repository.ts",
    "src/shared/errors.ts",
    "src/shared/db/connection.ts",
    "tests/unit/modules/leave-management/leave-management.service.test.ts"
  ],
  "filePaths": [
    "src/modules/leave-management/leave-management.service.ts",
    "tests/unit/modules/leave-management/leave-management.service.test.ts"
  ],
  "message": "Implement approveLeave and rejectLeave methods in the LeaveManagementService.\n\n## approveLeave(leaveId: string, approverId: string): Promise<LeaveRequest>\n1. Validate leaveId and approverId are valid UUID format (throw BadRequestError if not)\n2. Fetch the leave request via ILeaveRepository.findById(leaveId) — throw NotFoundError if not found\n3. Fetch the approver via IEmployeeRepository.findById(approverId) — throw NotFoundError if not found\n4. Validate approver has 'manager' role AND is the manager of the requesting employee (leaveRequest.employeeId) — throw ForbiddenError if not\n5. Validate leave request status is 'Pending' — throw BadRequestError if not\n6. Within a single database transaction (using pool):\n   a. Update leave request status to LeaveRequestStatus.Approved, set approverId and approvedAt\n   b. Fetch the employee's LeaveBalance via IBalanceRepository.findByEmployeeId\n   c. Move pendingDays to usedDays (usedDays += leaveRequest.days, pendingDays -= leaveRequest.days)\n   d. Create an AuditLog entry (action: 'LEAVE_APPROVED', entity: 'LeaveRequest', entityId: leaveId, performedBy: approverId)\n   e. Create a Notification for the employee (type: 'LEAVE_APPROVED', message about approval)\n   f. Commit transaction\n7. Return the updated LeaveRequest\n\n## rejectLeave(leaveId: string, approverId: string, comment?: string): Promise<LeaveRequest>\n1. Validate leaveId and approverId are valid UUID format\n2. Fetch the leave request — throw NotFoundError if not found\n3. Fetch the approver — throw NotFoundError if not found\n4. Validate approver has 'manager' role AND is the manager of the requesting employee — throw ForbiddenError if not\n5. Validate leave request status is 'Pending' — throw BadRequestError if not\n6. Within a single database transaction:\n   a. Update leave request status to LeaveRequestStatus.Rejected, set approverId, rejectedAt, and rejectionComment if provided\n   b. Fetch the employee's LeaveBalance\n   c. Release pendingDays (pendingDays -= leaveRequest.days)\n   d. Create an AuditLog entry (action: 'LEAVE_REJECTED', entity: 'LeaveRequest', entityId: leaveId, performedBy: approverId)\n   e. Create a Notification for the employee (type: 'LEAVE_REJECTED', message about rejection with optional comment)\n   f. Commit transaction\n7. Return the updated LeaveRequest\n\nUse a UUID regex pattern for validation: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i\n\nAlso update the test file with comprehensive tests covering:\n- Successful approval (status updated, balance adjusted, audit log created, notification sent)\n- Successful rejection (status updated, pendingDays released, audit log created, notification sent)\n- Unauthorized approver (not a manager or not the employee's manager) throws ForbiddenError\n- Invalid leaveId UUID format throws BadRequestError\n- Invalid approverId UUID format throws BadRequestError\n- Leave request not found throws NotFoundError\n- Leave request not in Pending status throws BadRequestError\n- Transaction rollback on failure (e.g., balance update fails, leave status should not change)\n\nUse the existing patterns from the service file and test file. Follow the existing import structure and repository interface signatures.",
  "extraFlags": [],
  "done": false,
  "reasoning": "Starting with architect format to plan the multi-file changes. Reading all relevant model, repository, and error files to give the LLM full context about the existing interfaces and types. The two writable files are the service and its test file."
}
```

## Iteration 2 decision
```json
{
  "editFormat": "architect",
  "readPaths": [],
  "filePaths": [],
  "message": "",
  "extraFlags": [],
  "done": true,
  "reasoning": "Verification passed. Both files were written successfully: the service file (9.9KB) with approveLeave and rejectLeave methods, and the test file (12.2KB) with comprehensive test coverage. The build succeeded and all tests passed. The success criteria are fully met: UUID validation, manager role/relationship checks with ForbiddenError, transactional updates to leave status/balance/audit/notification for both approve and reject flows, and thorough unit tests covering success, unauthorized, invalid input, not found, wrong status, and rollback scenarios."
}
```