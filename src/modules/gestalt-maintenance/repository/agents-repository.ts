import { Agent } from '../domain/agents';

/**
 * Repository for accessing agent data.
 */
export class AgentsRepository {
  /**
   * Fetches all agents.
   * @returns Promise<Agent[]>
   */
  async getAllAgents(): Promise<Agent[]> {
    // Implementation for fetching agents from the database
    return [];
  }

  /**
   * Updates an agent's information.
   * @param agentId - The ID of the agent to update.
   * @param data - The data to update the agent with.
   * @returns Promise<void>
   */
  async updateAgent(agentId: string, data: Partial<Agent>): Promise<void> {
    // Implementation for updating an agent in the database
  }
}