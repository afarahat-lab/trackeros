import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { IEmployeeService } from './employee.service';

const employeeIdParamSchema = z.object({
  id: z.string().uuid()
});

const listEmployeesQuerySchema = z.object({
  department: z.string().optional(),
  status: z.string().optional(),
  managerId: z.string().uuid().optional()
});

export class EmployeeController {
  constructor(private readonly employeeService: IEmployeeService) {}

  getEmployee = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = employeeIdParamSchema.parse(request.params);
      const employee = await this.employeeService.getEmployee(id);
      if (!employee) {
        return reply.status(404).send({ error: 'Employee not found' });
      }
      return reply.send(employee);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid UUID', details: error.errors });
      }
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  };

  getEmployees = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const filters = listEmployeesQuerySchema.parse(request.query);
      const employees = await this.employeeService.listEmployees(filters);
      return reply.send(employees);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid query parameters', details: error.errors });
      }
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  };

  getSubordinates = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = employeeIdParamSchema.parse(request.params);
      const subordinates = await this.employeeService.getSubordinates(id);
      return reply.send(subordinates);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid UUID', details: error.errors });
      }
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  };
}
