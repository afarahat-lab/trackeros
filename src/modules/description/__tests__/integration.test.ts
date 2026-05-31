import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const MODULE_PATH = path.resolve(__dirname, '../');

function checkModuleExists(modulePath) {
  return fs.existsSync(modulePath);
}

describe('SC-1: The entity description is either removed from the domain model or a new module is introduced under src/modules/description/', () => {
  it('should verify that the description module exists', () => {
    const descriptionModulePath = path.join(MODULE_PATH, 'description');
    const moduleExists = checkModuleExists(descriptionModulePath);
    expect(moduleExists).toBe(true);
  });

  it('should verify that the description domain model does not exist if the module is removed', () => {
    const descriptionDomainPath = path.join(MODULE_PATH, 'description/domain/description.ts');
    const domainExists = checkModuleExists(descriptionDomainPath);
    expect(domainExists).toBe(false);
  });

  it('should verify that the description domain model exists if the module is introduced', () => {
    const descriptionDomainPath = path.join(MODULE_PATH, 'description/domain/description.ts');
    const domainExists = checkModuleExists(descriptionDomainPath);
    expect(domainExists).toBe(true);
  });
});
