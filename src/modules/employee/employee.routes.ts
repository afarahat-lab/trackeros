import { FastifyInstance } from 'fastify';
import { EmployeeController } from './employee.controller';
import { EmployeeService } from './employee.service';
import { EmployeeRepository } from './employee.repository';
import { requireRoles } from '../../shared/middleware/rbac';

export async function employeeRoutes(fastify: FastifyInstance) {
  const employeeRepository = new EmployeeRepository();
  const employeeService = new EmployeeService(employeeRepository);
  const employeeController = new EmployeeController(employeeService);

  fastify.get('/employees/:id', {
    preHandler: [requireRoles(['ADMIN', 'MANAGER', 'EMPLOYEE'])]
  }, employeeController.getEmployee);

  fastify.get('/employees', {
    preHandler: [requireRoles(['ADMIN', 'MANAGER'])]
  }, employeeController.getEmployees);

  fastify.get('/employees/:id/subordinates', {
    preHandler: [requireRoles(['ADMIN', 'MANAGER'])]
  }, employeeController.getSubordinates);
}
