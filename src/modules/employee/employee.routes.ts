import { FastifyInstance } from 'fastify';
import { EmployeeService } from './employee.service';
import { IEmployeeRepository } from './employee.repository.interface';
import {
  setEmployeeService,
  getEmployeeById,
  getEmployeeByNumber,
  getSubordinates,
  createEmployee,
  updateEmployee,
  terminateEmployee,
} from './employee.controller';

export async function employeeRoutes(
  fastify: FastifyInstance,
  repository: IEmployeeRepository
): Promise<void> {
  const employeeService = new EmployeeService(repository);
  setEmployeeService(employeeService);

  fastify.get('/employees/:id', getEmployeeById);
  fastify.get('/employees/number/:employeeNumber', getEmployeeByNumber);
  fastify.get('/employees/manager/:managerId/subordinates', getSubordinates);
  fastify.post('/employees', createEmployee);
  fastify.put('/employees/:id', updateEmployee);
  fastify.post('/employees/:id/terminate', terminateEmployee);
}
