import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { LeaveType } from '../../shared/types';
import { IPolicyService } from './policy.service';

const policyIdParamSchema = z.object({
  id: z.string().uuid()
});

const createPolicyBodySchema = z.object({
  policyName: z.string(),
  leaveType: z.nativeEnum(LeaveType),
  entitlementDays: z.number(),
  accrualRate: z.number().optional(),
  maxAccumulation: z.number().optional(),
  minimumNoticeDays: z.number().optional(),
  requiresManagerApproval: z.boolean().optional(),
  isActive: z.boolean().optional()
});

const updatePolicyBodySchema = createPolicyBodySchema.partial();

export class PolicyController {
  constructor(private readonly policyService: IPolicyService) {}

  async getPolicy(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { id } = policyIdParamSchema.parse(request.params);
      const policy = await this.policyService.getPolicy(id);
      if (!policy) {
        reply.status(404).send({ message: 'Policy not found' });
        return;
      }
      reply.send(policy);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        reply.status(400).send({ message: 'Invalid input', errors: error.issues });
        return;
      }
      reply.status(500).send({ message: 'Internal server error' });
    }
  }

  async getPolicies(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const policies = await this.policyService.getPolicies();
      reply.send(policies);
    } catch (error: any) {
      reply.status(500).send({ message: 'Internal server error' });
    }
  }

  async createPolicy(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const dto = createPolicyBodySchema.parse(request.body);
      const user = (request as any).user;
      const policy = await this.policyService.createPolicy(dto, user?.id);
      reply.status(201).send(policy);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        reply.status(400).send({ message: 'Invalid input', errors: error.issues });
        return;
      }
      reply.status(500).send({ message: 'Internal server error' });
    }
  }

  async updatePolicy(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { id } = policyIdParamSchema.parse(request.params);
      const dto = updatePolicyBodySchema.parse(request.body);
      const user = (request as any).user;
      const policy = await this.policyService.updatePolicy(id, dto, user?.id);
      reply.send(policy);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        reply.status(400).send({ message: 'Invalid input', errors: error.issues });
        return;
      }
      reply.status(500).send({ message: 'Internal server error' });
    }
  }
}
