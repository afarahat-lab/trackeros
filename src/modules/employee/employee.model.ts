export interface Employee {
  id: string;
  fullName: string;
  email: string;
  department: string | null;
  managerId: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
