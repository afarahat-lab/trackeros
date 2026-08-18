import { FastifyRequest, FastifyReply } from 'fastify';
import { EmployeeService } from './employee.service';
import { CreateEmployeeDto } from './employee.service.interface';

let employeeService: EmployeeService;

export function setEmployeeService(service: EmployeeService): void {
  employeeService = service;
}

export async function getEmployeeById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const { id } = request.params;
  const employee = await employeeService.getById(id);
  if (!employee) {
    await reply.status(404).send({ error: 'Employee not found', code: 'NOT_FOUND' });
    return;
  }
  await reply.status(200).send(employee);
}

export async function getEmployeeByNumber(
  request: FastifyRequest<{ Params: { employeeNumber: string } }>,
  reply: FastifyReply
): Promise<void> {
  const { employeeNumber } = request.params;
  const employee = await employeeService.getByEmployeeNumber(employeeNumber);
  if (!employee) {
    await reply.status(404).send({ error: 'Employee not found', code: 'NOT_FOUND' });
    return;
  }
  await reply.status(200).send(employee);
}

export async function getSubordinates(
  request: FastifyRequest<{ Params: { managerId: string } }>,
  reply: FastifyReply
): Promise<void> {
  const { managerId } = request.params;
  const subordinates = await employeeService.getSubordinates(managerId);
  await reply.status(200).send(subordinates);
}

export async function createEmployee(
  request: FastifyRequest<{ Body: CreateEmployeeDto }>,
  reply: FastifyReply
): Promise<void> {
  const dto: CreateEmployeeDto = {
    employeeNumber: request.body.employeeNumber,
    firstName: request.body.firstName,
    lastName: request.body.lastName,
    email: request.body.email,
    managerId: request.body.managerId,
    department: request.body.department,
    hireDate: new Date(request.body.hireDate),
  };

  const employee = await employeeService.create(dto);
  await reply.status(201).send(employee);
}

export async function updateEmployee(
  request: FastifyRequest<{ Params: { id: string }; Body: Record<string, unknown> }>,
  reply: FastifyReply
): Promise<void> {
  const { id } = request.params;
  const employee = await employeeService.update(id, request.body);
  if (!employee) {
    await reply.status(404).send({ error: 'Employee not found', code: 'NOT_FOUND' });
    return;
  }
  await reply.status(200).send(employee);
}

export async function terminateEmployee(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const { id } = request.params;
  const employee = await employeeService.terminate(id);
  if (!employee) {
    await reply.status(404).send({ error: 'Employee not found', code: 'NOT_FOUND' });
    return;
  }
  await reply.status(200).send(employee);
}
