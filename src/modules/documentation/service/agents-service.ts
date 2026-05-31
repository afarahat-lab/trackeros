import { AgentsRepository } from '../repository/agents-repository';

export class AgentsService {
  private repository: AgentsRepository;

  constructor(repository: AgentsRepository) {
    this.repository = repository;
  }

  /**
   * Updates the agent documentation to reference a golden principle.
   * @param agentId - The ID of the agent to update.
   * @param principle - The golden principle to reference.
   * @returns A promise that resolves when the update is complete.
   */
  async updateAgentDocumentation(agentId: string, principle: string): Promise<void> {
    await this.repository.updateAgentWithPrinciple(agentId, principle);
  }
}