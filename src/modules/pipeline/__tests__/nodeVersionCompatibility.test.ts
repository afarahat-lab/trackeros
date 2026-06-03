import { describe, it, expect } from 'vitest';
import { engines } from '../../../../package.json';

// Mock process.version to simulate different Node.js versions
const originalProcessVersion = process.version;

function setNodeVersion(version: string) {
  Object.defineProperty(process, 'version', {
    value: version,
    writable: true,
  });
}

describe('SC-1: Node.js version compatibility', () => {
  afterEach(() => {
    // Restore the original process.version after each test
    setNodeVersion(originalProcessVersion);
  });

  it('should pass when Node.js version is compatible', () => {
    setNodeVersion('v22.13.0');
    const requiredVersion = engines.node;
    const isCompatible = process.version >= requiredVersion;
    expect(isCompatible).toBe(true);
  });

  it('should fail when Node.js version is incompatible', () => {
    setNodeVersion('v22.12.0');
    const requiredVersion = engines.node;
    const isCompatible = process.version >= requiredVersion;
    expect(isCompatible).toBe(false);
  });
});
