export interface Employee {
  id: string;
  name: string;
  email: string;
  managerId: string | null;
  department: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

export type CreateEmployeeInput = Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>;

export type UpdateEmployeeInput = Partial<CreateEmployeeInput>;
