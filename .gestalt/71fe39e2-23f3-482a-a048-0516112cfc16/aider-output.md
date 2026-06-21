## Iteration 1 decision
```json
{
  "editFormat": "architect",
  "readPaths": [],
  "filePaths": [
    "src/modules/balance/balance.model.ts",
    "src/modules/balance/balance.repository.ts"
  ],
  "message": "Create the following two files exactly as specified:\n\n1. src/modules/balance/balance.model.ts\n```typescript\nexport interface LeaveBalance {\n  id: string;\n  employeeId: string;\n  leaveTypeId: string;\n  totalEntitlement: number;\n  usedDays: number;\n  pendingDays: number;\n  year: number;\n  createdAt: Date;\n  updatedAt: Date;\n}\n\nexport interface CreateLeaveBalanceDto {\n  employeeId: string;\n  leaveTypeId: string;\n  totalEntitlement: number;\n  year: number;\n}\n```\n\n2. src/modules/balance/balance.repository.ts\n```typescript\nimport { Pool } from 'pg';\nimport { LeaveBalance, CreateLeaveBalanceDto } from './balance.model';\n\nexport interface ILeaveBalanceRepository {\n  findById(id: string): Promise<LeaveBalance | null>;\n  findByEmployeeIdAndYear(employeeId: string, year: number): Promise<LeaveBalance[]>;\n  findByEmployeeIdAndLeaveTypeIdAndYear(employeeId: string, leaveTypeId: string, year: number): Promise<LeaveBalance | null>;\n  create(dto: CreateLeaveBalanceDto): Promise<LeaveBalance>;\n  update(id: string, updates: Partial<Pick<LeaveBalance, 'usedDays' | 'pendingDays' | 'totalEntitlement'>>): Promise<LeaveBalance>;\n}\n\nexport class LeaveBalanceRepository implements ILeaveBalanceRepository {\n  private pool: Pool;\n\n  constructor(pool: Pool) {\n    this.pool = pool;\n  }\n\n  private mapRow(row: any): LeaveBalance {\n    return {\n      id: row.id,\n      employeeId: row.employee_id,\n      leaveTypeId: row.leave_type_id,\n      totalEntitlement: Number(row.total_entitlement),\n      usedDays: Number(row.used_days),\n      pendingDays: Number(row.pending_days),\n      year: row.year,\n      createdAt: row.created_at,\n      updatedAt: row.updated_at,\n    };\n  }\n\n  async findById(id: string): Promise<LeaveBalance | null> {\n    const result = await this.pool.query('SELECT * FROM leave_balances WHERE id = $1', [id]);\n    return result.rows[0] ? this.mapRow(result.rows[0]) : null;\n  }\n\n  async findByEmployeeIdAndYear(employeeId: string, year: number): Promise<LeaveBalance[]> {\n    const result = await this.pool.query('SELECT * FROM leave_balances WHERE employee_id = $1 AND year = $2', [employeeId, year]);\n    return result.rows.map(this.mapRow);\n  }\n\n  async findByEmployeeIdAndLeaveTypeIdAndYear(employeeId: string, leaveTypeId: string, year: number): Promise<LeaveBalance | null> {\n    const result = await this.pool.query('SELECT * FROM leave_balances WHERE employee_id = $1 AND leave_type_id = $2 AND year = $3', [employeeId, leaveTypeId, year]);\n    return result.rows[0] ? this.mapRow(result.rows[0]) : null;\n  }\n\n  async create(dto: CreateLeaveBalanceDto): Promise<LeaveBalance> {\n    const result = await this.pool.query(\n      `INSERT INTO leave_balances (employee_id, leave_type_id, total_entitlement, year)\n       VALUES ($1, $2, $3, $4)\n       RETURNING *`,\n      [dto.employeeId, dto.leaveTypeId, dto.totalEntitlement, dto.year]\n    );\n    return this.mapRow(result.rows[0]);\n  }\n\n  async update(id: string, updates: Partial<Pick<LeaveBalance, 'usedDays' | 'pendingDays' | 'totalEntitlement'>>): Promise<LeaveBalance> {\n    const setClauses: string[] = [];\n    const values: any[] = [];\n    let paramIndex = 1;\n\n    if (updates.usedDays !== undefined) {\n      setClauses.push(`used_days = $${paramIndex++}`);\n      values.push(updates.usedDays);\n    }\n    if (updates.pendingDays !== undefined) {\n      setClauses.push(`pending_days = $${paramIndex++}`);\n      values.push(updates.pendingDays);\n    }\n    if (updates.totalEntitlement !== undefined) {\n      setClauses.push(`total_entitlement = $${paramIndex++}`);\n      values.push(updates.totalEntitlement);\n    }\n\n    if (setClauses.length === 0) {\n      throw new Error('No updates provided');\n    }\n\n    values.push(id);\n    const query = `UPDATE leave_balances SET ${setClauses.join(', ')}, updated_at = now() WHERE id = $${paramIndex} RETURNING *`;\n    const result = await this.pool.query(query, values);\n    return this.mapRow(result.rows[0]);\n  }\n}\n```",
  "extraFlags": [],
  "done": false,
  "reasoning": "Using the architect format as required by the project harness to begin the phase. Providing the exact code for both the model and repository files to ensure strict compliance with the canonical schema, interfaces, and field names. Fixed a minor import contradiction in the architecture spec where ILeaveBalanceRepository was listed in the import from balance.model but actually defined in balance.repository.ts."
}
```

## Iteration 2 decision
```json
{
  "editFormat": "architect",
  "readPaths": [],
  "filePaths": [],
  "message": "",
  "extraFlags": [],
  "done": true,
  "reasoning": "Both files were successfully written and verification passed (build + tests). The LeaveBalance interface, CreateLeaveBalanceDto, ILeaveBalanceRepository interface, and LeaveBalanceRepository class are all in place with correct field names and snake_case-to-camelCase mapping. Phase 4 is complete."
}
```