import { RepositoryError } from '../employee';

export class LeaveNotFoundError extends RepositoryError {
  constructor(id: string) {
    super('LEAVE_NOT_FOUND', `Leave request with id '${id}' not found`);
    this.name = 'LeaveNotFoundError';
  }
}

export class LeaveStateTransitionError extends RepositoryError {
  constructor(message: string) {
    super('INVALID_LEAVE_STATE', message);
    this.name = 'LeaveStateTransitionError';
  }
}

export class LeaveForbiddenError extends RepositoryError {
  constructor(message: string) {
    super('FORBIDDEN', message);
    this.name = 'LeaveForbiddenError';
  }
}

export class ActiveLeavePolicyNotFoundError extends RepositoryError {
  constructor(leaveType: string) {
    super(
      'LEAVE_POLICY_NOT_FOUND',
      `No active leave policy exists for leave type '${leaveType}'`
    );
    this.name = 'ActiveLeavePolicyNotFoundError';
  }
}
