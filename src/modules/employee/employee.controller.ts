import { FastifyReply, FastifyRequest } from 'fastify';

import { IEmployeeService } from './employee.service.interface';

export function makeEmployeeController(service: IEmployeeService) {
  return {
    getEmployeeById: async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const employee = await service.getById(id);
      if (!employee) {
        return reply.status(404).send({ error: 'Employee not found' });
      }
      return reply.status(200).send(employee);
    },

    getEmployeeByNumber: async (request: FastifyRequest, reply: FastifyReply) => {
      const { employeeNumber } = request.params as { employeeNumber: string };
      const employee = await service.getByEmployeeNumber(employeeNumber);
      if (!employee) {
        return reply.status(404).send({ error: 'Employee not found' });
      }
      return reply.status(200).send(employee);
    },

    getSubordinates: async (request: FastifyRequest, reply: FastifyReply) => {
      const { managerId } = request.params as { managerId: string };
      const subordinates = await service.getSubordinates(managerId);
      return reply.status(200).send(subordinates);
    },

    createEmployee: async (request: FastifyRequest, reply: FastifyReply) => {
      const data = request.body as Record<string, unknown>;
      const employee = await service.create({
        employeeNumber: data.employeeNumber as string,
        firstName: data.firstName as string,
        lastName: data.lastName as string,
        email: data.email as string,
        managerId: data.managerId as string | null | undefined,
        department: data.department as string,
        hireDate: new Date(data.hireDate as string),
      });
      return reply.status(201).send(employee);
    },

    updateEmployee: async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const data = request.body as Record<string, unknown>;
      const employee = await service.update(id, data);
      if (!employee) {
        return reply.status(404).send({ error: 'Employee not found' });
      }
      return reply.status(200).send(employee);
    },

    terminateEmployee: async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const employee = await service.terminate(id);
      if (!employee) {
        return reply.status(404).send({ error: 'Employee not found' });
      }
      return reply.status(200).send(employee);
    },
  };
}
