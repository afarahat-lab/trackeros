import { FastifyInstance } from 'fastify';
import { IPolicyService } from './policy.service';
import { PolicyController } from './policy.controller';
import { requireRoles } from '../../shared/middleware/rbac';

export async function policyRoutes(fastify: FastifyInstance, policyService: IPolicyService): Promise<void> {
  const controller = new PolicyController(policyService);

  fastify.get('/policies/:id', {
    preHandler: [requireRoles(['read:policy'])],
  }, controller.getPolicy.bind(controller));

  fastify.get('/policies', {
    preHandler: [requireRoles(['read:policy'])],
  }, controller.getPolicies.bind(controller));

  fastify.post('/policies', {
    preHandler: [requireRoles(['create:policy'])],
  }, controller.createPolicy.bind(controller));

  fastify.put('/policies/:id', {
    preHandler: [requireRoles(['update:policy'])],
  }, controller.updatePolicy.bind(controller));
}
