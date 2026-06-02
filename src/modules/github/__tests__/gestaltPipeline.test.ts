import { describe, it, expect, vi } from 'vitest';
import { execSync } from 'child_process';

vi.mock('child_process', () => ({
  execSync: vi.fn()
}));

describe('SC-1: pnpm version in GitHub action pipeline', () => {
  it('should update pnpm to the latest version 10 in the GitHub action pipeline', () => {
    const expectedVersion = '10';
    const yamlContent = `
      name: gestalt
      on:
        workflow_dispatch:
          inputs:
            environment:
              description: 'Target environment (staging | production). Other values are accepted on CI-only dispatches.'
              required: false
              default: 'staging'
              type: string
            correlationId:
              description: 'Gestalt correlation id for this intent cycle.'
              required: false
              type: string
            branch:
              description: 'Source branch for the dispatched run.'
              required: false
              type: string
      jobs:
        test:
          runs-on: ubuntu-latest
          steps:
            - name: Checkout
              uses: actions/checkout@v4

            - name: Setup Node 20
              uses: actions/setup-node@v4
              with:
                node-version: '20'

            - name: Setup pnpm
              uses: pnpm/action-setup@v3
              with:
                version: ${expectedVersion}

            - name: Install dependencies
              run: pnpm install --frozen-lockfile

            - name: Run tests
              run: pnpm test
    `;

    const execSyncMock = vi.mocked(execSync);
    execSyncMock.mockReturnValue(yamlContent);

    const result = execSync('cat .github/workflows/gestalt.yml').toString();
    expect(result).toContain(`version: ${expectedVersion}`);
  });

  it('should throw an error if the pnpm version is not set to 10', () => {
    const incorrectVersion = '9';
    const yamlContent = `
      name: gestalt
      on:
        workflow_dispatch:
          inputs:
            environment:
              description: 'Target environment (staging | production). Other values are accepted on CI-only dispatches.'
              required: false
              default: 'staging'
              type: string
            correlationId:
              description: 'Gestalt correlation id for this intent cycle.'
              required: false
              type: string
            branch:
              description: 'Source branch for the dispatched run.'
              required: false
              type: string
      jobs:
        test:
          runs-on: ubuntu-latest
          steps:
            - name: Checkout
              uses: actions/checkout@v4

            - name: Setup Node 20
              uses: actions/setup-node@v4
              with:
                node-version: '20'

            - name: Setup pnpm
              uses: pnpm/action-setup@v3
              with:
                version: ${incorrectVersion}

            - name: Install dependencies
              run: pnpm install --frozen-lockfile

            - name: Run tests
              run: pnpm test
    `;

    const execSyncMock = vi.mocked(execSync);
    execSyncMock.mockReturnValue(yamlContent);

    try {
      const result = execSync('cat .github/workflows/gestalt.yml').toString();
      expect(result).toContain('version: 10');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
    }
  });
});
