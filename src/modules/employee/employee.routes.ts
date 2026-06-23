import { FastifyInstance } from 'fastify';
import { EmployeeController } from './employee.controller';
import { requireRoles } from '../../shared/middleware/rbac';
import { IEmployeeService } from './employee.service';

export async function employeeRoutes(fastify: FastifyInstance, employeeService: IEmployeeService): Promise<void> {
  const controller = new EmployeeController(employeeService);

  fastify.get('/employees/:id', {
    preHandler: [requireRoles(['admin', 'manager', 'employee'])],
  }, controller.getEmployee.bind(controller));

  fastify.get('/employees', {
    preHandler: [requireRoles(['admin', 'manager'])],
  }, controller.getEmployees.bind(controller));

  fastify.get('/employees/:id/subordinates', {
    preHandler: [requireRoles(['admin', 'manager'])],
  }, controller.getSubordinates.bind(controller));
}
