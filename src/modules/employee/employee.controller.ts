import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { IEmployeeService } from './employee.service';
import { EmployeeFilters } from './employee.model';

const employeeIdParamSchema = z.object({
  id: z.string().uuid(),
});

const listEmployeesQuerySchema = z.object({
  department: z.string().optional(),
  employmentStatus: z.enum(['ACTIVE', 'INACTIVE', 'TERMINATED']).optional(),
  search: z.string().optional(),
});

export class EmployeeController {
  constructor(private readonly employeeService: IEmployeeService) {}

  async getEmployee(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { id } = employeeIdParamSchema.parse(request.params);
      const employee = await this.employeeService.getEmployee(id);
      if (!employee) {
        reply.status(404).send({ message: 'Employee not found' });
        return;
      }
      reply.send(employee);
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.status(400).send({ message: 'Invalid input', errors: error.issues });
        return;
      }
      reply.status(500).send({ message: 'Internal server error' });
    }
  }

  async getEmployees(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const filters: EmployeeFilters = listEmployeesQuerySchema.parse(request.query);
      const employees = await this.employeeService.listEmployees(filters);
      reply.send(employees);
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.status(400).send({ message: 'Invalid input', errors: error.issues });
        return;
      }
      reply.status(500).send({ message: 'Internal server error' });
    }
  }

  async getSubordinates(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { id } = employeeIdParamSchema.parse(request.params);
      const subordinates = await this.employeeService.getSubordinates(id);
      reply.send(subordinates);
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.status(400).send({ message: 'Invalid input', errors: error.issues });
        return;
      }
      reply.status(500).send({ message: 'Internal server error' });
    }
  }
}
