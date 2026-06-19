import { LeavePolicy } from './policy.model';
import { ILeavePolicyRepository } from './policy.repository';
import { IEmployeeRepository } from '../employee/employee.repository';

export interface LeavePolicyService {
  getPolicy(policyId: string): Promise<LeavePolicy | null>;
  getActivePolicies(): Promise<LeavePolicy[]>;
  getPolicyByLeaveType(leaveType: string): Promise<LeavePolicy | null>;
  validateRequest(policyId: string, employeeId: string, startDate: Date): Promise<{ isValid: boolean; errors: string[] }>;
  checkEligibility(policyId: string, employeeId: string): Promise<{ eligible: boolean; reasons: string[] }>;
}

export class PolicyService implements LeavePolicyService {
  constructor(
    private readonly policyRepository: ILeavePolicyRepository,
    private readonly employeeRepository: IEmployeeRepository
  ) {}

  async getPolicy(policyId: string): Promise<LeavePolicy | null> {
    if (!policyId) {
      throw new Error('Policy ID is required');
    }
    return this.policyRepository.findById(policyId);
  }

  async getActivePolicies(): Promise<LeavePolicy[]> {
    return this.policyRepository.findAllActive();
  }

  async getPolicyByLeaveType(leaveType: string): Promise<LeavePolicy | null> {
    if (!leaveType) {
      throw new Error('Leave type is required');
    }
    const policies = await this.policyRepository.findByQuery({ leaveType });
    return policies.length > 0 ? policies[0] : null;
  }

  async validateRequest(policyId: string, employeeId: string, startDate: Date): Promise<{ isValid: boolean; errors: string[] }> {
    if (!policyId || !employeeId || !startDate) {
      throw new Error('Missing required parameters');
    }

    const errors: string[] = [];

    const policy = await this.policyRepository.findById(policyId);
    if (!policy) {
      errors.push('Policy not found');
      return { isValid: false, errors };
    }

    if (!policy.isActive) {
      errors.push('Policy is not active');
    }

    if (policy.minimumNoticeDays) {
      const noticeDays = Math.floor((startDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (noticeDays < policy.minimumNoticeDays) {
        errors.push(`Minimum notice of ${policy.minimumNoticeDays} days required`);
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  async checkEligibility(policyId: string, employeeId: string): Promise<{ eligible: boolean; reasons: string[] }> {
    if (!policyId || !employeeId) {
      throw new Error('Missing required parameters');
    }

    const reasons: string[] = [];

    const policy = await this.policyRepository.findById(policyId);
    if (!policy) {
      reasons.push('Policy not found');
      return { eligible: false, reasons };
    }

    if (!policy.isActive) {
      reasons.push('Policy is not active');
    }

    const employee = await this.employeeRepository.findById(employeeId);
    if (!employee) {
      reasons.push('Employee not found');
      return { eligible: false, reasons };
    }

    if (employee.employmentStatus !== 'ACTIVE') {
      reasons.push('Employee is not active');
    }

    const hireDate = new Date(employee.hireDate);
    const probationEnd = new Date(hireDate);
    probationEnd.setDate(probationEnd.getDate() + 90);

    if (new Date() < probationEnd) {
      reasons.push('Employee is still in probation period');
    }

    return { eligible: reasons.length === 0, reasons };
  }
}
