import { describe, it, expect, vi } from 'vitest';
import { execSync } from 'child_process';

// Mock execSync to simulate command execution
vi.mock('child_process', () => ({
  execSync: vi.fn()
}));

const { execSync: mockedExecSync } = require('child_process');

describe('SC-1: Application Start Script', () => {
  it('should start the application using pnpm start', () => {
    // Arrange
    const expectedCommand = 'pnpm run build && node dist/index.js';

    // Act
    execSync('pnpm start');

    // Assert
    expect(mockedExecSync).toHaveBeenCalledWith(expectedCommand);
  });

  it('should throw an error if the start command fails', () => {
    // Arrange
    mockedExecSync.mockImplementation(() => {
      throw new Error('Command failed');
    });

    // Act & Assert
    expect(() => execSync('pnpm start')).toThrow('Command failed');
  });
});
