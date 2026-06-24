import { PostgresNotesRepository } from '../../../../src/modules/notes/notes.repository';
import { AppError } from '../../../../src/shared/types';
import { NoteStatus } from '../../../../src/modules/notes/notes.model';

jest.mock('pg');

describe('PostgresNotesRepository', () => {
  let repository: PostgresNotesRepository;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    mockQuery = jest.fn();
    const mockPool = {
      query: mockQuery
    } as any;
    repository = new PostgresNotesRepository(mockPool);
  });

  describe('findAll', () => {
    it('returns active notes ordered by created_at DESC', async () => {
      const mockRows = [
        { id: '1', title: 'Note 1', body: 'Body 1', status: 'ACTIVE', created_at: new Date(), updated_at: new Date() }
      ];
      mockQuery.mockResolvedValue({ rows: mockRows });

      const notes = await repository.findAll();

      expect(mockQuery).toHaveBeenCalledWith(
        "SELECT * FROM notes WHERE status = 'ACTIVE' ORDER BY created_at DESC"
      );
      expect(notes).toHaveLength(1);
      expect(notes[0].id).toBe('1');
    });

    it('throws AppError on failure', async () => {
      mockQuery.mockRejectedValue(new Error('DB error'));

      await expect(repository.findAll()).rejects.toThrow(AppError);
    });
  });

  describe('findById', () => {
    it('returns note if active', async () => {
      const mockRows = [
        { id: '1', title: 'Note 1', body: 'Body 1', status: 'ACTIVE', created_at: new Date(), updated_at: new Date() }
      ];
      mockQuery.mockResolvedValue({ rows: mockRows });

      const note = await repository.findById('1');

      expect(mockQuery).toHaveBeenCalledWith(
        "SELECT * FROM notes WHERE id = $1 AND status = 'ACTIVE'",
        ['1']
      );
      expect(note).not.toBeNull();
      expect(note?.id).toBe('1');
    });

    it('returns null if not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const note = await repository.findById('1');

      expect(note).toBeNull();
    });

    it('throws AppError on failure', async () => {
      mockQuery.mockRejectedValue(new Error('DB error'));

      await expect(repository.findById('1')).rejects.toThrow(AppError);
    });
  });

  describe('create', () => {
    it('inserts note and returns with ACTIVE status', async () => {
      const mockRows = [
        { id: '1', title: 'New Note', body: 'New Body', status: 'ACTIVE', created_at: new Date(), updated_at: new Date() }
      ];
      mockQuery.mockResolvedValue({ rows: mockRows });

      const note = await repository.create({ title: 'New Note', body: 'New Body' });

      expect(mockQuery).toHaveBeenCalledWith(
        'INSERT INTO notes (title, body) VALUES ($1, $2) RETURNING *',
        ['New Note', 'New Body']
      );
      expect(note.status).toBe(NoteStatus.ACTIVE);
    });

    it('throws AppError on failure', async () => {
      mockQuery.mockRejectedValue(new Error('DB error'));

      await expect(repository.create({ title: 'New Note', body: 'New Body' })).rejects.toThrow(AppError);
    });
  });
});
