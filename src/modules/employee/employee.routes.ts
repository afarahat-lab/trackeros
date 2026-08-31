import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { UnitOfWork } from '../../shared/db/unit-of-work.impl';
import { requireRole } from '../../shared/http/require-role';
import { UserRole } from '../../shared/types';
import { PgEmployeeRepository } from './employee.repository';
import { CreateEmployeeInput } from './employee.service.interface';
import { EmployeeService, InvalidEmployeeTransitionError } from './employee.service';

const createEmployeeSchema = z.object({
  employeeNumber: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.email(),
  managerId: z.string().nullable(),
  department: z.string().nullable(),
  hireDate: z.coerce.date(),
  terminationDate: z.coerce.date().nullable(),
  employmentStatus: z.enum(['ACTIVE', 'INACTIVE', 'TERMINATED']),
});

const updateEmployeeSchema = z
  .object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    email: z.email().optional(),
    managerId: z.string().nullable().optional(),
    department: z.string().nullable().optional(),
    hireDate: z.coerce.date().optional(),
    terminationDate: z.coerce.date().nullable().optional(),
    employmentStatus: z.enum(['ACTIVE', 'INACTIVE', 'TERMINATED']).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export async function employeeRoutes(fastify: FastifyInstance): Promise<void> {
  const employees = new EmployeeService(new PgEmployeeRepository(), new UnitOfWork());

  fastify.get('/employees', { preHandler: requireRole(UserRole.HR_ADMIN) }, async (request, reply) => {
    try {
      const result = await employees.list();
      return reply.status(200).send(result);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal Server Error', code: 'INTERNAL_ERROR' });
    }
  });

  fastify.get<{ Params: { id: string } }>(
    '/employees/:id',
    { preHandler: requireRole(UserRole.HR_ADMIN, UserRole.MANAGER) },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const employee = await employees.findById(id);
        if (!employee) {
          return reply.status(404).send({ error: 'Employee not found', code: 'NOT_FOUND' });
        }
        return reply.status(200).send(employee);
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal Server Error', code: 'INTERNAL_ERROR' });
      }
    },
  );

  fastify.post('/employees', { preHandler: requireRole(UserRole.HR_ADMIN) }, async (request, reply) => {
    try {
      const parsed = createEmployeeSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Invalid request body', code: 'VALIDATION_ERROR' });
      }
      const input: CreateEmployeeInput = {
        employeeNumber: parsed.data.employeeNumber,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        email: parsed.data.email,
        managerId: parsed.data.managerId,
        department: parsed.data.department,
        hireDate: parsed.data.hireDate,
        terminationDate: parsed.data.terminationDate,
        employmentStatus: parsed.data.employmentStatus,
      };
      const employee = await employees.create(input);
      return reply.status(201).send(employee);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal Server Error', code: 'INTERNAL_ERROR' });
    }
  });

  fastify.put<{ Params: { id: string } }>(
    '/employees/:id',
    { preHandler: requireRole(UserRole.HR_ADMIN) },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const parsed = updateEmployeeSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.status(400).send({ error: 'Invalid request body', code: 'VALIDATION_ERROR' });
        }
        const employee = await employees.update(id, parsed.data);
        if (!employee) {
          return reply.status(404).send({ error: 'Employee not found', code: 'NOT_FOUND' });
        }
        return reply.status(200).send(employee);
      } catch (error) {
        if (error instanceof InvalidEmployeeTransitionError) {
          return reply.status(404).send({ error: error.message, code: 'NOT_FOUND' });
        }
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal Server Error', code: 'INTERNAL_ERROR' });
      }
    },
  );
}
