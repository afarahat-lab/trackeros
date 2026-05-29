import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { RoleService } from '../service/role-service';
import { Role } from '../domain/role';
import { auditLog } from '../../../shared/utils/audit-log';
import { authenticate, authorize } from '../../../shared/auth/rbac-middleware';

const roleSchema = z.object({
  roleName: z.string(),
  permissions: z.array(z.string())
});

export async function roleRoutes(fastify: FastifyInstance, roleService: RoleService) {
  fastify.get('/api/v1/roles', {
    preHandler: [authenticate, authorize(['admin', 'operator'])]
  }, async (request, reply) => {
    const roles = await roleService.getAllRoles();
    reply.send({ roles });
  });

  fastify.post('/api/v1/roles', {
    preHandler: [authenticate, authorize(['admin'])]
  }, async (request, reply) => {
    const result = roleSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send(result.error);
    }

    const role: Role = result.data;
    const createdRole = await roleService.createRole(role);
    await auditLog.append({ action: 'create', entity: 'role', data: createdRole });
    reply.status(201).send({ role: createdRole });
  });
}
