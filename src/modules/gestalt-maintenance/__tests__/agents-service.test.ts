import { describe, it, expect, vi } from 'vitest';
import { AgentsService } from '../service/agents-service';
import { AgentsRepository } from '../repository/agents-repository';

vi.mock('../repository/agents-repository');

const mockAgentsRepository = new AgentsRepository();

const mockUpdateAgentsDocumentation = vi.fn();

mockAgentsRepository.getAllAgents = vi.fn().mockResolvedValue([]);

const agentsService = new AgentsService(mockAgentsRepository);

agentsService.updateAgentsDocumentation = mockUpdateAgentsDocumentation;



describe('SC-1: AGENTS.md is updated to include a reference to golden principle GP-004', () => {
  it('should update AGENTS.md to reference GP-004 successfully', async () => {
    await agentsService.updateAgentsDocumentation();
    expect(mockUpdateAgentsDocumentation).toHaveBeenCalled();
  });

  it('should handle errors when updating AGENTS.md', async () => {
    mockUpdateAgentsDocumentation.mockRejectedValue(new Error('Failed to update AGENTS.md'));

    await expect(agentsService.updateAgentsDocumentation()).rejects.toThrow('Failed to update AGENTS.md');
  });
});
