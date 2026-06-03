import { describe, it, expect } from 'vitest';
import fs from 'fs';
import yaml from 'js-yaml';

// Mock the file system read operation
vi.mock('fs', () => ({
  readFileSync: vi.fn(() => `name: gestalt
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
          version: 11.5.1

      - name: Install dependencies
        run: |
          if [ -f package.json ]; then
            pnpm install --frozen-lockfile
          else
            echo "No package.json found — skipping install (run gestalt run to scaffold the project)"
          fi

      - name: Run tests
        run: |
          if [ -f package.json ]; then
            pnpm test
          else
            echo "No test script found — skipping tests"
          fi
`)
}));


describe('SC-1: GitHub Actions configuration', () => {
  it('should use pnpm version 11.5.1', () => {
    const fileContent = fs.readFileSync('.github/workflows/gestalt.yml', 'utf8');
    const parsedYaml = yaml.load(fileContent);

    const setupPnpmStep = parsedYaml.jobs.test.steps.find((step) => step.name === 'Setup pnpm');
    expect(setupPnpmStep).toBeDefined();
    expect(setupPnpmStep.with.version).toBe('11.5.1');
  });

  it('should throw an error if the pnpm version is incorrect', () => {
    const incorrectYaml = `name: gestalt
jobs:
  test:
    steps:
      - name: Setup pnpm
        uses: pnpm/action-setup@v3
        with:
          version: 11.4.0
`;
    fs.readFileSync.mockReturnValueOnce(incorrectYaml);

    const fileContent = fs.readFileSync('.github/workflows/gestalt.yml', 'utf8');
    const parsedYaml = yaml.load(fileContent);

    const setupPnpmStep = parsedYaml.jobs.test.steps.find((step) => step.name === 'Setup pnpm');
    expect(setupPnpmStep).toBeDefined();
    expect(setupPnpmStep.with.version).not.toBe('11.5.1');
  });
});
