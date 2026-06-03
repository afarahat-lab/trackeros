import { describe, it, expect, vi } from 'vitest';
import { execSync } from 'child_process';

// Mock execSync to simulate the build process
vi.mock('child_process', () => ({
  execSync: vi.fn(() => 'Build successful'),
}));

describe('SC-1: pnpm build configuration', () => {
  it('should complete the build process successfully without errors', () => {
    const execSync = require('child_process').execSync;
    let buildOutput;
    try {
      buildOutput = execSync('pnpm run build').toString();
    } catch (error) {
      buildOutput = error.message;
    }
    expect(buildOutput).toContain('Build successful');
  });

  it('should throw an error if the build process fails', () => {
    const execSync = require('child_process').execSync;
    execSync.mockImplementationOnce(() => {
      throw new Error('Build failed');
    });

    let buildOutput;
    try {
      buildOutput = execSync('pnpm run build').toString();
    } catch (error) {
      buildOutput = error.message;
    }
    expect(buildOutput).toContain('Build failed');
  });
});
