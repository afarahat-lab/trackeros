import { describe, it, expect, vi } from 'vitest';
import { DescriptionRepository } from '../repository/description-repository';
import { db } from '../../shared/db';

vi.mock('../../shared/db', () => ({
  db: {
    query: vi.fn()
  }
}));

describe('SC-1: Description Repository', () => {
  it('should retrieve all descriptions from the database', async () => {
    const mockDescriptions = [{ id: '1', title: 'Title 1', content: 'Content 1' }];
    db.query.mockResolvedValue({ rows: mockDescriptions });

    const repository = new DescriptionRepository();
    const descriptions = await repository.getAll();

    expect(descriptions).toEqual(mockDescriptions);
    expect(db.query).toHaveBeenCalledWith('SELECT * FROM descriptions');
  });

  it('should handle database query errors', async () => {
    db.query.mockRejectedValue(new Error('Database error'));

    const repository = new DescriptionRepository();

    await expect(repository.getAll()).rejects.toThrow('Database error');
  });
});
