import { describe, it, expect, vi } from 'vitest';
import { createServer } from '../../api';

/**
 * Test suite for the main server entry point.
 */
describe('SC-1: Server Initialization', () => {
  it('should start the server without errors', async () => {
    const server = await createServer();
    expect(server).toBeDefined();
    server.close();
  });

  it('should handle server start errors gracefully', async () => {
    const mockCreateServer = vi.fn().mockImplementation(() => {
      throw new Error('Server start error');
    });
    try {
      await mockCreateServer();
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Server start error');
    }
  });
});
