import { FastifyInstance } from 'fastify';
import { EmployeeController } from './employee.controller';
import { EmployeeService } from './employee.service';
import { PgEmployeeRepository } from './employee.repository';

export async function employeeRoutes(fastify: FastifyInstance): Promise<void> {
  const repository = new PgEmployeeRepository();
  const service = new EmployeeService(repository);
  const controller = new EmployeeController(service);

  fastify.get('/employees', (request, reply) => controller.getActive(request, reply));
  fastify.get('/employees/:id', (request, reply) => controller.getById(request, reply));
  fastify.get('/employees/employee-number/:employeeNumber', (request, reply) => controller.getByEmployeeNumber(request, reply));
  fastify.get('/employees/manager/:managerId', (request, reply) => controller.getByManagerId(request, reply));
  fastify.get('/employees/department/:department', (request, reply) => controller.getByDepartment(request, reply));
  fastify.post('/employees', (request, reply) => controller.create(request, reply));
  fastify.put('/employees/:id', (request, reply) => controller.update(request, reply));
  fastify.delete('/employees/:id', (request, reply) => controller.delete(request, reply));
}
