import { describe, it, expect, vi } from 'vitest';

// Mock function to get the latest version
const getLatestVersion = vi.fn();

// Function to update package manager version
function updatePackageManagerVersion(packageJson) {
  const currentVersion = packageJson.packageManager.split('@')[1];
  const latestVersion = getLatestVersion();

  if (!latestVersion) {
    throw new Error('Failed to retrieve the latest version');
  }

  if (currentVersion !== latestVersion) {
    packageJson.packageManager = `pnpm@${latestVersion}`;
  }

  return packageJson;
}

describe('SC-1: Update package manager version', () => {
  it('should update the package manager version to the latest version', () => {
    const packageJson = {
      packageManager: 'pnpm@9.17.0'
    };
    getLatestVersion.mockReturnValue('9.18.0');

    const updatedPackageJson = updatePackageManagerVersion(packageJson);

    expect(updatedPackageJson.packageManager).toBe('pnpm@9.18.0');
  });

  it('should not update the package manager version if it is already the latest', () => {
    const packageJson = {
      packageManager: 'pnpm@9.18.0'
    };
    getLatestVersion.mockReturnValue('9.18.0');

    const updatedPackageJson = updatePackageManagerVersion(packageJson);

    expect(updatedPackageJson.packageManager).toBe('pnpm@9.18.0');
  });

  it('should throw an error if the latest version cannot be retrieved', () => {
    const packageJson = {
      packageManager: 'pnpm@9.17.0'
    };
    getLatestVersion.mockReturnValue(null);

    expect(() => updatePackageManagerVersion(packageJson)).toThrow('Failed to retrieve the latest version');
  });
});
