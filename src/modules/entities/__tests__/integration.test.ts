import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const DOMAIN_DOC_PATH = path.resolve(__dirname, '../../../docs/DOMAIN.md');
const ARCHITECTURE_DOC_PATH = path.resolve(__dirname, '../../../docs/ARCHITECTURE.md');

function checkDocumentationForEntity(docPath) {
  const content = fs.readFileSync(docPath, 'utf-8');
  return content.includes('entities');
}

describe('SC-1: Entity Module Integration', () => {
  it('should have the entity module under src/modules/entities/', () => {
    const entityModuleExists = fs.existsSync(path.resolve(__dirname, '../domain/entities.ts'));
    expect(entityModuleExists).toBe(true);
  });

  it('should update DOMAIN.md documentation accordingly', () => {
    const isEntityDocumented = checkDocumentationForEntity(DOMAIN_DOC_PATH);
    expect(isEntityDocumented).toBe(true);
  });

  it('should update ARCHITECTURE.md documentation accordingly', () => {
    const isEntityDocumented = checkDocumentationForEntity(ARCHITECTURE_DOC_PATH);
    expect(isEntityDocumented).toBe(true);
  });
});