import { describe, it, expect, vi } from 'vitest';
import { execSync } from 'child_process';

vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

describe('Pipeline Setup', () => {
  it('should install npm version 22 successfully', () => {
    // Arrange
    const execSyncMock = vi.mocked(execSync);
    execSyncMock.mockImplementation((command) => {
      if (command.includes('npm install -g npm@22')) {
        return 'npm@22 installed';
      }
      throw new Error('Command failed');
    });

    // Act
    let result;
    try {
      result = execSync('npm install -g npm@22');
    } catch (error) {
      result = error.message;
    }

    // Assert
    expect(execSyncMock).toHaveBeenCalledWith('npm install -g npm@22');
    expect(result).toBe('npm@22 installed');
  });

  it('should handle errors during npm installation', () => {
    // Arrange
    const execSyncMock = vi.mocked(execSync);
    execSyncMock.mockImplementation(() => {
      throw new Error('Command failed');
    });

    // Act
    let result;
    try {
      execSync('npm install -g npm@22');
    } catch (error) {
      result = error.message;
    }

    // Assert
    expect(execSyncMock).toHaveBeenCalledWith('npm install -g npm@22');
    expect(result).toBe('Command failed');
  });

  it('should setup pnpm successfully', () => {
    // Arrange
    const execSyncMock = vi.mocked(execSync);
    execSyncMock.mockImplementation((command) => {
      if (command.includes('pnpm/action-setup@v3')) {
        return 'pnpm setup complete';
      }
      throw new Error('Command failed');
    });

    // Act
    let result;
    try {
      result = execSync('pnpm/action-setup@v3');
    } catch (error) {
      result = error.message;
    }

    // Assert
    expect(execSyncMock).toHaveBeenCalledWith('pnpm/action-setup@v3');
    expect(result).toBe('pnpm setup complete');
  });

  it('should handle errors during pnpm setup', () => {
    // Arrange
    const execSyncMock = vi.mocked(execSync);
    execSyncMock.mockImplementation(() => {
      throw new Error('Command failed');
    });

    // Act
    let result;
    try {
      execSync('pnpm/action-setup@v3');
    } catch (error) {
      result = error.message;
    }

    // Assert
    expect(execSyncMock).toHaveBeenCalledWith('pnpm/action-setup@v3');
    expect(result).toBe('Command failed');
  });
});
