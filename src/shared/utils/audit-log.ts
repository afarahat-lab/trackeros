import { v4 as uuidv4 } from 'uuid';

/**
 * Append an audit log entry for state-changing operations.
 * @param userId - ID of the user performing the operation.
 * @param action - Description of the action performed.
 * @param details - Additional details about the operation.
 */
export const append = async (userId: string, action: string, details: Record<string, unknown>) => {
  const auditEntry = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    userId,
    action,
    details
  };
  // Use platform logger instead of console.log
  // logger.info('audit log entry', auditEntry);
  // Persist auditEntry to a database or external service
};