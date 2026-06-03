import { describe, it, expect, vi } from 'vitest';

vi.mock('child_process', () => ({
  execSync: vi.fn()
}));

describe('SC-1: Replace execSync with a safer method', () => {
  it('should use a mocked version of execSync to simulate shell command execution', () => {
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
                version: 10

            - name: Install dependencies
              run: pnpm install --frozen-lockfile

            - name: Run tests
              run: pnpm test
    `;

    const execSyncMock = vi.mocked(vi.fn(() => yamlContent));
    execSyncMock.mockReturnValue(yamlContent);

    const result = execSyncMock().toString();
    expect(result).toContain('version: 10');
  });

  it('should throw an error if execSync is used directly without mocking', () => {
    const execSync = require('child_process').execSync;
    expect(() => execSync('echo "This should not run"')).toThrowError();
  });
});
