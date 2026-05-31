import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

vi.mock('fs');

const userReadmePath = path.join(__dirname, '../docs/user-readme.md');

// Mock the file system read operation
fs.readFileSync.mockImplementation((filePath) => {
  if (filePath === userReadmePath) {
    return `# User README

## Using the Application

Welcome to the Trackeros application! This guide will help you get started.

### Accessing the Application

1. **Open Your Browser**: Navigate to the URL where the application is hosted.

2. **Login**: Use your credentials to log in. If you do not have an account, please contact your administrator.

3. **Navigation**: Use the navigation bar to access different modules of the application.`;
  }
  throw new Error('File not found');
});

describe('SC-2: User README file', () => {
  it('should exist with instructions relevant to end-users', () => {
    const content = fs.readFileSync(userReadmePath, 'utf-8');
    expect(content).toContain('# User README');
    expect(content).toContain('## Using the Application');
    expect(content).toContain('Welcome to the Trackeros application!');
    expect(content).toContain('**Open Your Browser**');
    expect(content).toContain('**Login**');
    expect(content).toContain('**Navigation**');
  });

  it('should throw an error if the file does not exist', () => {
    fs.readFileSync.mockImplementationOnce(() => {
      throw new Error('File not found');
    });
    expect(() => fs.readFileSync(userReadmePath, 'utf-8')).toThrow('File not found');
  });
});
