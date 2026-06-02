import pino from 'pino';

const logger = pino();

/**
 * Provides a shared logger instance.
 * @returns {pino.Logger} The logger instance
 */
export const getLogger = (): pino.Logger => logger;