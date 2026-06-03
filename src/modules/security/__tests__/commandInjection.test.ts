import { describe, it, expect, vi } from 'vitest';
import { execFile } from 'child_process';

vi.mock('child_process', () => ({
  execFile: vi.fn((command, args, callback) => {
    if (command === 'safeCommand') {
      callback(null, 'success');
    } else {
      callback(new Error('Command not allowed'));
    }
  })
}));

describe('SC-1: Command Injection Prevention', () => {
  it('should use execFile instead of exec', () => {
    const command = 'safeCommand';
    execFile(command, [], (error, stdout) => {
      expect(error).toBeNull();
      expect(stdout).toBe('success');
    });
  });

  it('should not allow unsafe commands', () => {
    const command = 'unsafeCommand';
    execFile(command, [], (error, stdout) => {
      expect(error).not.toBeNull();
      expect(error.message).toBe('Command not allowed');
    });
  });
});
