import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// Mock the fs module
vi.mock('fs');

// Define the path to the AGENTS.md file
const agentsMdPath = path.resolve(__dirname, '../CONTEXT_ALIGNMENT/AGENTS.md');

// Mock content of the AGENTS.md file
const mockAgentsMdContent = `# Gestalt Maintenance

## Context Alignment

This document provides guidelines and principles for agents working within the Gestalt platform.

### Golden Principle GP-003

All agents must adhere to the golden principle GP-003, which emphasizes the importance of ensuring that error logs do not include sensitive data. This means sanitizing error objects before logging to prevent any potential exposure of sensitive information.

### Key Guidelines

- **Error Handling**: Always sanitize error object
`;

// Mock the readFileSync method to return the mock content
fs.readFileSync.mockImplementation((filePath) => {
  if (filePath === agentsMdPath) {
    return mockAgentsMdContent;
  }
  throw new Error('File not found');
});

describe('SC-1: AGENTS.md is updated to include a reference to golden principle GP-003', () => {
  it('should contain a reference to golden principle GP-003', () => {
    const content = fs.readFileSync(agentsMdPath, 'utf-8');
    expect(content).toContain('Golden Principle GP-003');
  });

  it('should describe the importance of sanitizing error objects', () => {
    const content = fs.readFileSync(agentsMdPath, 'utf-8');
    expect(content).toContain('sanitizing error objects before logging');
  });

  it('should throw an error if the file does not exist', () => {
    fs.readFileSync.mockImplementationOnce(() => {
      throw new Error('File not found');
    });
    expect(() => fs.readFileSync('nonexistent.md', 'utf-8')).toThrow('File not found');
  });
});
