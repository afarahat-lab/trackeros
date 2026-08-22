export interface Employee {
  id: string;
  fullName: string;
  email: string;
  department: string;
  managerId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
