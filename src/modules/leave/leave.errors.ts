export class InsufficientBalanceError extends Error {
  constructor(
    public readonly employeeId: string,
    public readonly requested: number,
    public readonly available: number,
  ) {
    super(
      `Insufficient balance for employee ${employeeId}: requested ${requested} days but only ${available} available`,
    );
    this.name = 'InsufficientBalanceError';
  }
}

export class OverlappingRequestError extends Error {
  constructor(
    public readonly employeeId: string,
    public readonly startDate: Date,
    public readonly endDate: Date,
  ) {
    super(
      `Employee ${employeeId} already has an overlapping request between ${startDate.toISOString()} and ${endDate.toISOString()}`,
    );
    this.name = 'OverlappingRequestError';
  }
}

export class EmployeeNotActiveError extends Error {
  constructor(public readonly employeeId: string) {
    super(`Employee ${employeeId} is not active`);
    this.name = 'EmployeeNotActiveError';
  }
}

export class MinimumNoticeError extends Error {
  constructor(
    public readonly requiredDays: number,
    public readonly actualDays: number,
  ) {
    super(
      `Minimum notice of ${requiredDays} days required, but only ${actualDays} days provided`,
    );
    this.name = 'MinimumNoticeError';
  }
}

export class NotManagerError extends Error {
  constructor(public readonly approverId: string) {
    super(`Approver ${approverId} is not authorized to approve/reject this request`);
    this.name = 'NotManagerError';
  }
}
