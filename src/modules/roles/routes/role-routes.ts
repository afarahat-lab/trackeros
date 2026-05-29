import { FastifyInstance } from 'fastify';
import { RoleService } from '../service/role-service';
import { z } from 'zod';
import { auditLog } from '../../../shared/utils/audit-log';

const roleSchema = z.object({
  roleName: z.string(),
  permissions: z.array(z.string())
});

export async function roleRoutes(fastify: FastifyInstance) {
  const roleService = new RoleService(new RoleRepository());

  fastify.get('/api/v1/roles', {
    preHandler: fastify.auth([fastify.verifyJWT, fastify.verifyRoles(['admin', 'operator'])]),
    handler: async (request, reply) => {
      const roles = await roleService.getRoles();
      reply.send({ roles });
    }
  });

  fastify.post('/api/v1/roles', {
    preHandler: fastify.auth([fastify.verifyJWT, fastify.verifyRoles(['admin'])]),
    handler: async (request, reply) => {
      const { roleName, permissions } = roleSchema.parse(request.body);
      const roleId = await roleService.createRole(roleName, permissions);
      await auditLog.append({ action: 'createRole', roleId, userId: request.user.id });
      reply.send({ roleId });
    }
  });

  fastify.put('/api/v1/roles/:roleId', {
    preHandler: fastify.auth([fastify.verifyJWT, fastify.verifyRoles(['admin'])]),
    handler: async (request, reply) => {
      const { roleName, permissions } = roleSchema.parse(request.body);
      const success = await roleService.updateRole(request.params.roleId, roleName, permissions);
      await auditLog.append({ action: 'updateRole', roleId: request.params.roleId, userId: request.user.id });
      reply.send({ success });
    }
  });

  fastify.delete('/api/v1/roles/:roleId', {
    preHandler: fastify.auth([fastify.verifyJWT, fastify.verifyRoles(['admin'])]),
    handler: async (request, reply) => {
      const success = await roleService.deleteRole(request.params.roleId);
      await auditLog.append({ action: 'deleteRole', roleId: request.params.roleId, userId: request.user.id });
      reply.send({ success });
    }
  });
}