import { Pool } from "pg";
import { Employee } from "../../shared/types";
import { IEmployeeRepository } from "./employee.repository.interface";

export class EmployeeRepository implements IEmployeeRepository {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async findById(id: string): Promise<Employee | null> {
    const result = await this.pool.query('SELECT * FROM employees WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async findByManagerId(managerId: string): Promise<Employee[]> {
    const result = await this.pool.query('SELECT * FROM employees WHERE manager_id = $1', [managerId]);
    return result.rows;
  }

  async findByDepartment(department: string): Promise<Employee[]> {
    const result = await this.pool.query('SELECT * FROM employees WHERE department = $1', [department]);
    return result.rows;
  }

  async findByEmail(email: string): Promise<Employee | null> {
    const result = await this.pool.query('SELECT * FROM employees WHERE email = $1', [email]);
    return result.rows[0] || null;
  }
}
