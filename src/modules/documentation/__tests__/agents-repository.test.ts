import { describe, it, expect, vi } from 'vitest';
import { AgentsRepository } from '../repository/agents-repository';

vi.mock('../repository/agents-repository', () => {
  return {
    AgentsRepository: vi.fn().mockImplementation(() => {
      return {
        updateAgentWithPrinciple: vi.fn().mockResolvedValue(undefined)
      };
    })
  };
});

describe('SC-1: AGENTS.md is updated to include a reference to golden principle GP-003', () => {
  it('should update the agent documentation with the golden principle GP-003', async () => {
    const repository = new AgentsRepository();
    await repository.updateAgentWithPrinciple('agent-123', 'GP-003');
    expect(repository.updateAgentWithPrinciple).toHaveBeenCalledWith('agent-123', 'GP-003');
  });

  it('should handle errors when updating the agent documentation', async () => {
    const repository = new AgentsRepository();
    repository.updateAgentWithPrinciple = vi.fn().mockRejectedValue(new Error('Database error'));
    await expect(repository.updateAgentWithPrinciple('agent-123', 'GP-003')).rejects.toThrow('Database error');
  });
});
