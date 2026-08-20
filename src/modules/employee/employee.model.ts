export interface Employee {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  managerId: string | null;
  department: string | null;
  hireDate: Date;
  terminationDate: Date | null;
  employmentStatus: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface IEmployeeRepository {
  findById(id: string): Promise<Employee | null>;
  findByEmployeeNumber(employeeNumber: string): Promise<Employee | null>;
  findAll(): Promise<Employee[]>;
  create(employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Employee>;
  update(id: string, data: Partial<Employee>): Promise<Employee | null>;
  softDelete(id: string): Promise<boolean>;
}
