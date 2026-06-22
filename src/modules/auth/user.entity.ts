export interface User {
  id: string;
  username: string;
  passwordHash: string;
  employeeId: string;
  role: 'employee' | 'manager';
}
