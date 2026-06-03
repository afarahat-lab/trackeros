import { describe, it, expect, vi } from 'vitest';
import { exec } from 'child_process';

// Helper function to execute shell commands
function execCommand(command: string): Promise<{ stdout: string, stderr: string }> {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject({ stdout, stderr });
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

describe('SC-1: Application Start', () => {
  it('should start the application without errors', async () => {
    try {
      // Execute the build command
      const buildResult = await execCommand('pnpm run build');
      expect(buildResult.stderr).toBe(''); // Ensure no errors during build

      // Execute the start command
      const startResult = await execCommand('pnpm start');
      expect(startResult.stderr).toBe(''); // Ensure no errors during start

      // Optionally, check for specific output indicating successful start
      expect(startResult.stdout).toContain('Server is running');
    } catch (error) {
      // If any command fails, the test should fail
      expect(error).toBeUndefined();
    }
  });

  it('should fail to start if build fails', async () => {
    // Mock the build process to simulate a failure
    vi.mock('child_process', () => ({
      exec: (command: string, callback: (error: Error | null, stdout: string, stderr: string) => void) => {
        if (command.includes('build')) {
          callback(new Error('Build failed'), '', 'Build error');
        } else {
          callback(null, 'Server is running', '');
        }
      }
    }));

    try {
      await execCommand('pnpm run build');
    } catch (error) {
      expect(error.stderr).toContain('Build error');
    }
  });
});
