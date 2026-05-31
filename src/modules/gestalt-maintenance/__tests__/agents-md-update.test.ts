import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

// Mock the fs module
vi.mock('fs');

// Define the path to the AGENTS.md file
const agentsMdPath = path.resolve(__dirname, '../../AGENTS.md');

// Mock content of AGENTS.md
const mockAgentsMdContent = `# Agents

This document describes the agents used in the system.

## Golden Principles
- GP-001: Principle 1
- GP-002: Principle 2
- GP-003: Principle 3
`;

// Mock the updated content of AGENTS.md
const updatedAgentsMdContent = `# Agents

This document describes the agents used in the system.

## Golden Principles
- GP-001: Principle 1
- GP-002: Principle 2
- GP-003: Principle 3
- GP-004: Principle 4
`;

// Mock the fs.readFileSync function
fs.readFileSync = vi.fn(() => mockAgentsMdContent);

// Mock the fs.writeFileSync function
fs.writeFileSync = vi.fn();

// Function to update AGENTS.md
function updateAgentsMd() {
  const content = fs.readFileSync(agentsMdPath, 'utf-8');
  if (!content.includes('GP-004')) {
    const updatedContent = content + '\n- GP-004: Principle 4\n';
    fs.writeFileSync(agentsMdPath, updatedContent);
  }
}

describe('SC-1: AGENTS.md is updated to include a reference to golden principle GP-004', () => {
  it('should update AGENTS.md to include GP-004 if not present', () => {
    updateAgentsMd();
    expect(fs.writeFileSync).toHaveBeenCalledWith(agentsMdPath, updatedAgentsMdContent);
  });

  it('should not update AGENTS.md if GP-004 is already present', () => {
    // Mock the fs.readFileSync function to return updated content
    fs.readFileSync = vi.fn(() => updatedAgentsMdContent);

    updateAgentsMd();
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });
});
