import { FastifyInstance } from 'fastify';
import { RoleService } from '../service/role-service';
import { RoleRepository } from '../repository/role-repository';
import { auditLog } from '../../../shared/utils/audit-log';

export async function roleRoutes(fastify: FastifyInstance) {
  const roleRepository = new RoleRepository();
  const roleService = new RoleService(roleRepository);

  fastify.get('/api/v1/roles', {
    preHandler: fastify.auth([fastify.verifyJWT, fastify.verifyRoles(['admin', 'operator'])]),
    handler: async (request, reply) => {
      const roles = await roleService.getAllRoles();
      reply.send({ roles });
    }
  });

  fastify.post('/api/v1/roles', {
    preHandler: fastify.auth([fastify.verifyJWT, fastify.verifyRoles(['admin'])]),
    handler: async (request, reply) => {
      const role = await roleService.createRole(request.body);
      await auditLog.append({ action: 'createRole', role });
      reply.send({ roleId: role.id });
    }
  });
}
