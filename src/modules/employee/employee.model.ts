export { Employee } from '../../shared/types';

export interface EmployeeFilters {
  department?: string;
  employmentStatus?: 'ACTIVE' | 'INACTIVE' | 'TERMINATED';
  search?: string;
}
