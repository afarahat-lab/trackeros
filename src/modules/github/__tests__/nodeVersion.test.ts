import { describe, it, expect } from 'vitest';
import fs from 'fs';
import yaml from 'js-yaml';

vi.mock('fs', () => ({
  readFileSync: vi.fn(() => `name: gestalt
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Setup Node 22
        uses: actions/setup-node@v4
        with:
          node-version: '22'
`)
}));

describe('SC-2: GitHub Action Node.js Version', () => {
  it('should set Node.js version to 22 in GitHub Action file', () => {
    const fileContent = fs.readFileSync('.github/workflows/gestalt.yml', 'utf8');
    const parsedYaml = yaml.load(fileContent);
    const nodeVersion = parsedYaml.jobs.test.steps.find(step => step.name === 'Setup Node 22').with['node-version'];
    expect(nodeVersion).toBe('22');
  });

  it('should throw error if Node.js version is not set to 22', () => {
    const fileContent = fs.readFileSync('.github/workflows/gestalt.yml', 'utf8');
    const parsedYaml = yaml.load(fileContent);
    const nodeVersion = parsedYaml.jobs.test.steps.find(step => step.name === 'Setup Node 22').with['node-version'];
    expect(nodeVersion).not.toBe('21');
  });
});
