import { Logger } from './logger';

/**
 * Utility for appending audit logs.
 */
export const auditLog = {
  async append(message: string, context: Record<string, unknown>): Promise<void> {
    Logger.info({ message, ...context });
  }
};
