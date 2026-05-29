import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { RoleService } from '../service/role-service';
import { auditLog } from '../../shared/utils/audit-log';
import { authenticate } from '../../shared/auth/authenticate';

const getAllRolesSchema = z.object({});
const createRoleSchema = z.object({
  roleName: z.string(),
  permissions: z.array(z.string())
});

export async function roleRoutes(fastify: FastifyInstance) {
  const roleService = new RoleService(new RoleRepository());

  fastify.get('/api/v1/roles', { preHandler: [authenticate(['admin', 'operator'])] }, async (request, reply) => {
    getAllRolesSchema.parse(request.query);
    const roles = await roleService.getAllRoles();
    auditLog.append('getAllRoles', { userId: request.user.id });
    return reply.send({ roles });
  });

  fastify.post('/api/v1/roles', { preHandler: [authenticate(['admin'])] }, async (request, reply) => {
    const body = createRoleSchema.parse(request.body);
    const role = await roleService.createRole(body);
    auditLog.append('createRole', { userId: request.user.id, role });
    return reply.send({ role });
  });

  fastify.put('/api/v1/roles/:id', { preHandler: [authenticate(['admin'])] }, async (request, reply) => {
    const body = createRoleSchema.parse(request.body);
    const role = await roleService.updateRole({ ...body, id: request.params.id });
    auditLog.append('updateRole', { userId: request.user.id, role });
    return reply.send({ role });
  });

  fastify.delete('/api/v1/roles/:id', { preHandler: [authenticate(['admin'])] }, async (request, reply) => {
    await roleService.deleteRole(request.params.id);
    auditLog.append('deleteRole', { userId: request.user.id, roleId: request.params.id });
    return reply.status(204).send();
  });
}