import { FastifyRequest, FastifyReply } from 'fastify';
import { EmployeeService } from './employee.service';
import { Employee } from './employee.model';

export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  async getById(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as Record<string, string>;
    const employee = await this.employeeService.getById(id);
    if (!employee) {
      return reply.status(404).send({ error: 'Employee not found' });
    }
    return reply.status(200).send(employee);
  }

  async getByEmployeeNumber(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { employeeNumber } = request.params as Record<string, string>;
    const employee = await this.employeeService.getByEmployeeNumber(employeeNumber);
    if (!employee) {
      return reply.status(404).send({ error: 'Employee not found' });
    }
    return reply.status(200).send(employee);
  }

  async getByManagerId(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { managerId } = request.params as Record<string, string>;
    const employees = await this.employeeService.getByManagerId(managerId);
    return reply.status(200).send(employees);
  }

  async getByDepartment(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { department } = request.params as Record<string, string>;
    const employees = await this.employeeService.getByDepartment(department);
    return reply.status(200).send(employees);
  }

  async getActive(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const employees = await this.employeeService.getActive();
    return reply.status(200).send(employees);
  }

  async create(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const body = request.body as Employee;
    const employee = await this.employeeService.create(body);
    return reply.status(201).send(employee);
  }

  async update(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as Record<string, string>;
    const body = request.body as Partial<Employee>;
    const employee = await this.employeeService.update(id, body);
    if (!employee) {
      return reply.status(404).send({ error: 'Employee not found' });
    }
    return reply.status(200).send(employee);
  }

  async delete(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as Record<string, string>;
    await this.employeeService.delete(id);
    return reply.status(204).send();
  }
}
