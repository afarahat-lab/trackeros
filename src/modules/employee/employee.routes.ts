import { FastifyInstance } from 'fastify';

import { makeEmployeeController } from './employee.controller';
import { EmployeeService } from './employee.service';
import { IEmployeeRepository } from './employee.repository.interface';

export async function employeeRoutes(
  fastify: FastifyInstance,
  repo: IEmployeeRepository,
): Promise<void> {
  const service = new EmployeeService(repo);
  const controller = makeEmployeeController(service);

  fastify.get('/employees/:id', controller.getEmployeeById);
  fastify.get('/employees/number/:employeeNumber', controller.getEmployeeByNumber);
  fastify.get('/employees/:managerId/subordinates', controller.getSubordinates);
  fastify.post('/employees', controller.createEmployee);
  fastify.put('/employees/:id', controller.updateEmployee);
  fastify.post('/employees/:id/terminate', controller.terminateEmployee);
}
