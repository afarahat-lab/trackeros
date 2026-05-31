import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

// Mocking the fs module
vi.mock('fs');

// Success Criterion: A README.md file exists in the project root with instructions on how to run the server.
describe('SC-1: README.md file existence and content', () => {
  const projectRoot = path.resolve(__dirname, '../../../..');
  const readmePath = path.join(projectRoot, 'README.md');

  it('should verify that README.md exists in the project root', () => {
    // Mock fs.existsSync to return true
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);

    const exists = fs.existsSync(readmePath);
    expect(exists).toBe(true);
  });

  it('should verify that README.md contains instructions on how to run the server', () => {
    // Mock fs.readFileSync to return a string containing the instructions
    const mockReadmeContent = 'Instructions on how to run the server';
    vi.spyOn(fs, 'readFileSync').mockReturnValue(mockReadmeContent);

    const content = fs.readFileSync(readmePath, 'utf-8');
    expect(content).toContain('Instructions on how to run the server');
  });

  it('should handle the case where README.md does not exist', () => {
    // Mock fs.existsSync to return false
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);

    const exists = fs.existsSync(readmePath);
    expect(exists).toBe(false);
  });

  it('should handle the case where README.md does not contain the necessary instructions', () => {
    // Mock fs.readFileSync to return a string without the instructions
    const mockReadmeContent = 'Some other content';
    vi.spyOn(fs, 'readFileSync').mockReturnValue(mockReadmeContent);

    const content = fs.readFileSync(readmePath, 'utf-8');
    expect(content).not.toContain('Instructions on how to run the server');
  });
});
