import { FastifyRequest, FastifyReply } from 'fastify';
import { ILeaveRequestService } from './leave-request.service.interface';

interface AuthenticatedUser {
  id: string;
  role: string;
}

interface FastifyRequestWithUser extends FastifyRequest {
  user?: AuthenticatedUser;
}

export class LeaveRequestController {
  constructor(private readonly service: ILeaveRequestService) {}

  async submit(request: FastifyRequestWithUser, reply: FastifyReply): Promise<void> {
    const { requestId } = request.params as { requestId: string };
    if (!requestId) {
      return reply.status(400).send({ error: 'requestId is required' });
    }

    const user = request.user;
    if (!user?.id) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    try {
      const result = await this.service.submitDraft(requestId, user.id);
      return reply.status(200).send(result);
    } catch (error: unknown) {
      if (error instanceof Error) {
        const err = error as Error & { name: string };
        if (err.name === 'RequestOwnershipError') {
          return reply.status(403).send({ error: err.message });
        }
        if (err.name === 'InvalidStateTransitionError') {
          return reply.status(409).send({ error: err.message });
        }
        return reply.status(400).send({ error: err.message });
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  }

  async approve(request: FastifyRequestWithUser, reply: FastifyReply): Promise<void> {
    const { requestId } = request.params as { requestId: string };
    if (!requestId) {
      return reply.status(400).send({ error: 'requestId is required' });
    }

    const user = request.user;
    if (!user?.id) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    try {
      const result = await this.service.approveRequest(requestId, user.id);
      return reply.status(200).send(result);
    } catch (error: unknown) {
      if (error instanceof Error) {
        const err = error as Error & { name: string };
        if (err.name === 'UnauthorizedApproverError') {
          return reply.status(403).send({ error: err.message });
        }
        if (err.name === 'InvalidStateTransitionError') {
          return reply.status(409).send({ error: err.message });
        }
        return reply.status(400).send({ error: err.message });
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  }

  async reject(request: FastifyRequestWithUser, reply: FastifyReply): Promise<void> {
    const { requestId } = request.params as { requestId: string };
    if (!requestId) {
      return reply.status(400).send({ error: 'requestId is required' });
    }

    const body = request.body as { rejectionReason?: string } | undefined;
    const rejectionReason = body?.rejectionReason;
    if (!rejectionReason || rejectionReason.trim().length === 0) {
      return reply.status(400).send({ error: 'rejectionReason is required' });
    }

    const user = request.user;
    if (!user?.id) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    try {
      const result = await this.service.rejectRequest(requestId, user.id, rejectionReason);
      return reply.status(200).send(result);
    } catch (error: unknown) {
      if (error instanceof Error) {
        const err = error as Error & { name: string };
        if (err.name === 'UnauthorizedApproverError') {
          return reply.status(403).send({ error: err.message });
        }
        if (err.name === 'InvalidStateTransitionError') {
          return reply.status(409).send({ error: err.message });
        }
        return reply.status(400).send({ error: err.message });
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  }

  async cancel(request: FastifyRequestWithUser, reply: FastifyReply): Promise<void> {
    const { requestId } = request.params as { requestId: string };
    if (!requestId) {
      return reply.status(400).send({ error: 'requestId is required' });
    }

    const user = request.user;
    if (!user?.id) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    try {
      const result = await this.service.cancelRequest(requestId, user.id);
      return reply.status(200).send(result);
    } catch (error: unknown) {
      if (error instanceof Error) {
        const err = error as Error & { name: string };
        if (err.name === 'RequestOwnershipError') {
          return reply.status(403).send({ error: err.message });
        }
        if (err.name === 'InvalidStateTransitionError') {
          return reply.status(409).send({ error: err.message });
        }
        return reply.status(400).send({ error: err.message });
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  }

  async getById(request: FastifyRequestWithUser, reply: FastifyReply): Promise<void> {
    const { requestId } = request.params as { requestId: string };
    if (!requestId) {
      return reply.status(400).send({ error: 'requestId is required' });
    }

    const user = request.user;
    if (!user?.id) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    try {
      const result = await this.service.getRequestById(requestId);
      if (!result) {
        return reply.status(404).send({ error: 'Leave request not found' });
      }
      return reply.status(200).send(result);
    } catch (error: unknown) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: error.message });
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  }

  async getMyRequests(request: FastifyRequestWithUser, reply: FastifyReply): Promise<void> {
    const user = request.user;
    if (!user?.id) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    try {
      const result = await this.service.getEmployeeRequests(user.id);
      return reply.status(200).send(result);
    } catch (error: unknown) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: error.message });
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  }

  async getPendingForManager(request: FastifyRequestWithUser, reply: FastifyReply): Promise<void> {
    const user = request.user;
    if (!user?.id) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    try {
      const result = await this.service.getPendingForManager(user.id);
      return reply.status(200).send(result);
    } catch (error: unknown) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: error.message });
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  }
}
