import { Pool } from 'pg';
import { Employee, CreateEmployeeDto } from './employee.model';

export interface IEmployeeRepository {
  findById(id: string): Promise<Employee | null>;
  findByEmail(email: string): Promise<Employee | null>;
  findByManagerId(managerId: string): Promise<Employee[]>;
  save(employee: CreateEmployeeDto): Promise<Employee>;
  update(employee: Employee): Promise<Employee>;
}

export class PostgresEmployeeRepository implements IEmployeeRepository {
  constructor(private readonly pool: Pool) {}

  async findById(id: string): Promise<Employee | null> {
    const query = `
      SELECT id, employee_number, first_name, last_name, email,
             manager_id, department, hire_date, is_active,
             created_at, updated_at
      FROM employees
      WHERE id = $1
    `;
    const result = await this.pool.query(query, [id]);
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapRowToEmployee(result.rows[0]);
  }

  async findByEmail(email: string): Promise<Employee | null> {
    const query = `
      SELECT id, employee_number, first_name, last_name, email,
             manager_id, department, hire_date, is_active,
             created_at, updated_at
      FROM employees
      WHERE email = $1
    `;
    const result = await this.pool.query(query, [email]);
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapRowToEmployee(result.rows[0]);
  }

  async findByManagerId(managerId: string): Promise<Employee[]> {
    const query = `
      SELECT id, employee_number, first_name, last_name, email,
             manager_id, department, hire_date, is_active,
             created_at, updated_at
      FROM employees
      WHERE manager_id = $1
    `;
    const result = await this.pool.query(query, [managerId]);
    return result.rows.map((row: any) => this.mapRowToEmployee(row));
  }

  async save(employee: CreateEmployeeDto): Promise<Employee> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const insertQuery = `
        INSERT INTO employees (employee_number, first_name, last_name, email,
                               manager_id, department, hire_date, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, employee_number, first_name, last_name, email,
                  manager_id, department, hire_date, is_active,
                  created_at, updated_at
      `;
      const values = [
        employee.employeeNumber,
        employee.firstName,
        employee.lastName,
        employee.email,
        employee.managerId ?? null,
        employee.department ?? null,
        employee.hireDate,
        employee.isActive ?? true,
      ];
      const result = await client.query(insertQuery, values);
      const savedEmployee = this.mapRowToEmployee(result.rows[0]);

      // Audit log insertion (GP-002)
      await client.query(
        `INSERT INTO audit_log (entity_type, entity_id, action, performed_by, details)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          'EMPLOYEE',
          savedEmployee.id,
          'CREATE',
          'system', // In a real app this would be the authenticated user
          JSON.stringify({ employeeNumber: savedEmployee.employeeNumber }),
        ]
      );

      await client.query('COMMIT');
      return savedEmployee;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async update(employee: Employee): Promise<Employee> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const updateQuery = `
        UPDATE employees
        SET employee_number = $1,
            first_name = $2,
            last_name = $3,
            email = $4,
            manager_id = $5,
            department = $6,
            hire_date = $7,
            is_active = $8,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $9
        RETURNING id, employee_number, first_name, last_name, email,
                  manager_id, department, hire_date, is_active,
                  created_at, updated_at
      `;
      const values = [
        employee.employeeNumber,
        employee.firstName,
        employee.lastName,
        employee.email,
        employee.managerId,
        employee.department,
        employee.hireDate,
        employee.isActive,
        employee.id,
      ];
      const result = await client.query(updateQuery, values);
      if (result.rows.length === 0) {
        throw new Error(`Employee with id ${employee.id} not found`);
      }
      const updatedEmployee = this.mapRowToEmployee(result.rows[0]);

      // Audit log insertion (GP-002)
      await client.query(
        `INSERT INTO audit_log (entity_type, entity_id, action, performed_by, details)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          'EMPLOYEE',
          updatedEmployee.id,
          'UPDATE',
          'system',
          JSON.stringify({ employeeNumber: updatedEmployee.employeeNumber }),
        ]
      );

      await client.query('COMMIT');
      return updatedEmployee;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private mapRowToEmployee(row: any): Employee {
    return {
      id: row.id,
      employeeNumber: row.employee_number,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      managerId: row.manager_id,
      department: row.department,
      hireDate: row.hire_date,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
