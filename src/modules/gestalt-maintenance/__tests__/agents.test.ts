import { describe, it, expect, vi } from 'vitest';
import { readOrientationDocument } from '../service/orientationService';

vi.mock('../service/orientationService', () => ({
  readOrientationDocument: vi.fn()
}));

/**
 * Test suite for verifying the presence of golden principle GP-004 in the AGENTS.md document.
 */
describe('AGENTS.md Document', () => {
  it('should reference the golden principle GP-004', async () => {
    const mockContent = 'This document includes reference to golden principle GP-004.';
    vi.mocked(readOrientationDocument).mockResolvedValue(mockContent);

    const documentContent = await readOrientationDocument();
    expect(documentContent).toContain('golden principle GP-004');
  });

  it('should handle errors when reading the document', async () => {
    vi.mocked(readOrientationDocument).mockRejectedValue(new Error('File not found'));

    try {
      await readOrientationDocument();
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('File not found');
    }
  });
});
