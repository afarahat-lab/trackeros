import { describe, it, expect } from 'vitest';
import { createServer } from '../api';

/**
 * Test suite for the main server entry point.
 */
describe('Server Initialization', () => {
  it('should start the server without errors', async () => {
    const server = await createServer();
    expect(server).toBeDefined();
    server.close();
  });
});
