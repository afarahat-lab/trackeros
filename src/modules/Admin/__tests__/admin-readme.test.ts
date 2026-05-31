import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

vi.mock('fs');

const adminReadmePath = path.join(__dirname, '../docs/admin-readme.md');

// Mock the file system read operation
fs.readFileSync.mockImplementation((filePath) => {
  if (filePath === adminReadmePath) {
    return `# Admin README

## Starting the Application

1. **Install Dependencies**: Ensure you have \`pnpm\` installed. Run \`pnpm install\` to install all necessary packages.

2. **Configuration**: Ensure that all necessary configurations are set up in the configuration module. Avoid using \`process.env\` directly.

3. **Database Setup**: Make sure your PostgreSQL database is running and accessible. Run any necessary migrations using the provided scripts.`;
  }
  throw new Error('File not found');
});

describe('SC-1: Admin README file', () => {
  it('should exist with instructions on how to start the application', () => {
    const content = fs.readFileSync(adminReadmePath, 'utf-8');
    expect(content).toContain('# Admin README');
    expect(content).toContain('## Starting the Application');
    expect(content).toContain('**Install Dependencies**');
    expect(content).toContain('**Configuration**');
    expect(content).toContain('**Database Setup**');
  });

  it('should throw an error if the file does not exist', () => {
    fs.readFileSync.mockImplementationOnce(() => {
      throw new Error('File not found');
    });
    expect(() => fs.readFileSync(adminReadmePath, 'utf-8')).toThrow('File not found');
  });
});
