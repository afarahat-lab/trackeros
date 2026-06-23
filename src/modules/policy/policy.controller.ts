import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { IPolicyService } from './policy.service';
import { CreateLeavePolicyDto, UpdateLeavePolicyDto } from '../../shared/types/index';

const createPolicySchema = z.object({
  policy_name: z.string().min(1),
  leave_type: z.enum(['annual', 'sick', 'emergency', 'unpaid', 'maternity', 'paternity']),
  entitlement_days: z.number().min(0),
  accrual_rate: z.number().optional(),
  max_accumulation: z.number().min(0).optional(),
  minimum_notice_days: z.number().int().min(0).optional(),
  requires_manager_approval: z.boolean().default(true),
  is_active: z.boolean().default(true),
});

const updatePolicySchema = z.object({
  policy_name: z.string().min(1).optional(),
  leave_type: z.enum(['annual', 'sick', 'emergency', 'unpaid', 'maternity', 'paternity']).optional(),
  entitlement_days: z.number().min(0).optional(),
  accrual_rate: z.number().optional(),
  max_accumulation: z.number().min(0).optional(),
  minimum_notice_days: z.number().int().min(0).optional(),
  requires_manager_approval: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

const paramsSchema = z.object({
  id: z.string().uuid(),
});

export class PolicyController {
  constructor(private readonly policyService: IPolicyService) {}

  async getPolicy(request: FastifyRequest, reply: FastifyReply) {
    const { id } = paramsSchema.parse(request.params);
    const policy = await this.policyService.getPolicy(id);
    if (!policy) {
      return reply.status(404).send({ error: 'Policy not found' });
    }
    return reply.send(policy);
  }

  async getPolicies(request: FastifyRequest, reply: FastifyReply) {
    const policies = await this.policyService.getPolicies();
    return reply.send(policies);
  }

  async createPolicy(request: FastifyRequest, reply: FastifyReply) {
    const dto = createPolicySchema.parse(request.body) as CreateLeavePolicyDto;
    const policy = await this.policyService.createPolicy(dto);
    return reply.status(201).send(policy);
  }

  async updatePolicy(request: FastifyRequest, reply: FastifyReply) {
    const { id } = paramsSchema.parse(request.params);
    const dto = updatePolicySchema.parse(request.body) as UpdateLeavePolicyDto;
    const policy = await this.policyService.updatePolicy(id, dto);
    return reply.send(policy);
  }
}
