// Leave model for managing leave requests

import { Pool } from 'src/shared/db/connection';

/**
 * Interface representing a leave request.
 */
export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveType: string;
  startDate: Date;
  endDate: Date;
  status: string;
}

// Exporting the LeaveRequest interface
export default LeaveRequest;
