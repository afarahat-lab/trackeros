import { Logger } from 'some-logger-package';

const logger = new Logger();

/**
 * Appends an entry to the audit log, ensuring no sensitive data is logged.
 * @param message - The log message
 * @param data - Additional data to log
 */
export const append = (message: string, data: Record<string, unknown>): void => {
  const sanitizedData = sanitizeData(data);
  logger.info(message, sanitizedData);
};

/**
 * Sanitizes data to ensure no sensitive information is logged.
 * @param data - The data to sanitize
 * @returns The sanitized data
 */
const sanitizeData = (data: Record<string, unknown>): Record<string, unknown> => {
  const sensitiveKeys = ['password', 'token', 'ssn', 'creditCard'];
  return Object.keys(data).reduce((acc, key) => {
    acc[key] = sensitiveKeys.includes(key) ? '***' : data[key];
    return acc;
  }, {} as Record<string, unknown>);
};
