import { EmploymentStatus } from '../../shared/types';

/**
 * Represents an employee in the organization.
 * Used for ownership of leave requests, manager approval chains, and employment status checks.
 *
 * Invariants (enforced at the service layer in later phases):
 * - employeeNumber is unique across all employees.
 * - email is unique across all employees.
 * - managerId is a self-referencing foreign key: null (top-level) or a valid Employee id.
 * - terminationDate must be null when employmentStatus is ACTIVE.
 * - terminationDate must be set when employmentStatus is TERMINATED.
 */
export interface Employee {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  managerId: string | null;
  department: string;
  hireDate: Date;
  terminationDate: Date | null;
  employmentStatus: EmploymentStatus;
  createdAt: Date;
  updatedAt: Date;
}
