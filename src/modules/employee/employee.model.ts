export interface Employee {
  id: string;
  email: string;
  name: string;
  managerId: string | null;
  department: string | null;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface CreateEmployeeDto {
  email: string;
  name: string;
  managerId?: string | null;
  department?: string | null;
  status?: 'active' | 'inactive';
}
