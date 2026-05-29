import { Agent } from '../domain/agent';
import { AgentRepository } from '../repository/agent-repository';

export class AgentService {
  private repository: AgentRepository;

  constructor(repository: AgentRepository) {
    this.repository = repository;
  }

  async updateAgent(agent: Agent): Promise<void> {
    // Business logic for updating an agent
    await this.repository.updateAgent(agent);
  }
}