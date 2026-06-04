import { describe, it, expect } from 'vitest';

import { VAULT_VERIFY_CONST } from '../constants';

describe('SC-1: VAULT_VERIFY_CONST', () => {
  it('should be exported and have a value of true', () => {
    expect(VAULT_VERIFY_CONST).toBe(true);
  });
});
