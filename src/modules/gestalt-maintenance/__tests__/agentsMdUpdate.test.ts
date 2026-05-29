import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

// Mock the fs module
vi.mock('fs');

// Define the path to the AGENTS.md file
const agentsMdPath = path.resolve(__dirname, '../docs/AGENTS.md');

// Mock content of AGENTS.md before the update
const mockAgentsMdContentBefore = `# Gestalt Maintenance Agents

## Overview

This document provides an overview of the agents involved in the Gestalt Maintenance module.

## Golden Principles

- **GP-001**: Ensure all agents are registered and monitored.
- **GP-002**: Maintain a consistent state across all agents.
- **GP-003**: Ensure high availability and reliability of agent services.

## Agent
`;

// Mock content of AGENTS.md after the update
const mockAgentsMdContentAfter = `# Gestalt Maintenance Agents

## Overview

This document provides an overview of the agents involved in the Gestalt Maintenance module.

## Golden Principles

- **GP-001**: Ensure all agents are registered and monitored.
- **GP-002**: Maintain a consistent state across all agents.
- **GP-003**: Ensure high availability and reliability of agent services.
- **GP-004**: No sensitive data in logs. Ensure that agent data does not contain sensitive information before logging, or sanitize it.

## Agent
`;

// Mock the readFileSync and writeFileSync functions
fs.readFileSync.mockImplementation((filePath) => {
  if (filePath === agentsMdPath) {
    return mockAgentsMdContentBefore;
  }
  throw new Error('File not found');
});

fs.writeFileSync.mockImplementation((filePath, data) => {
  if (filePath === agentsMdPath) {
    expect(data).toBe(mockAgentsMdContentAfter);
  } else {
    throw new Error('File not found');
  }
});

// Function to update AGENTS.md
function updateAgentsMd() {
  const content = fs.readFileSync(agentsMdPath, 'utf-8');
  if (!content.includes('**GP-004**')) {
    const updatedContent = content.replace(
      '## Golden Principles\n\n',
      '## Golden Principles\n\n- **GP-004**: No sensitive data in logs. Ensure that agent data does not contain sensitive information before logging, or sanitize it.\n'
    );
    fs.writeFileSync(agentsMdPath, updatedContent);
  }
}

describe('SC-1: AGENTS.md is updated to include a reference to golden principle GP-004', () => {
  it('should update AGENTS.md to include GP-004 if it is missing', () => {
    updateAgentsMd();
    expect(fs.writeFileSync).toHaveBeenCalledWith(agentsMdPath, mockAgentsMdContentAfter);
  });

  it('should not update AGENTS.md if GP-004 is already present', () => {
    fs.readFileSync.mockImplementationOnce(() => mockAgentsMdContentAfter);
    updateAgentsMd();
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });
});
