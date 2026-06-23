import { FastifyInstance } from 'fastify';
import { PolicyController } from './policy.controller';
import { IPolicyService } from './policy.service';
import { requireRoles } from '../../shared/middleware/rbac';

export async function policyRoutes(
  fastify: FastifyInstance,
  policyService: IPolicyService
) {
  const controller = new PolicyController(policyService);

  fastify.get('/policies/:id', {
    preHandler: [requireRoles(['admin', 'manager'])],
  }, controller.getPolicy.bind(controller));

  fastify.get('/policies', {
    preHandler: [requireRoles(['admin', 'manager'])],
  }, controller.getPolicies.bind(controller));

  fastify.post('/policies', {
    preHandler: [requireRoles(['admin'])],
  }, controller.createPolicy.bind(controller));

  fastify.put('/policies/:id', {
    preHandler: [requireRoles(['admin'])],
  }, controller.updatePolicy.bind(controller));
}
