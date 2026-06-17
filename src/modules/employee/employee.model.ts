export interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  managerId?: string;
  createdAt: Date;
  updatedAt: Date;
}
