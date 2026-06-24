import { Pool } from 'pg';
import { Note, CreateNoteDto, NoteStatus } from './notes.model';
import { AppError } from '../../shared/types';

export interface INotesRepository {
  findAll(): Promise<Note[]>;
  findById(id: string): Promise<Note | null>;
  create(dto: CreateNoteDto): Promise<Note>;
}

export class PostgresNotesRepository implements INotesRepository {
  constructor(private readonly pool: Pool) {}

  async findAll(): Promise<Note[]> {
    try {
      const result = await this.pool.query(
        "SELECT * FROM notes WHERE status = 'ACTIVE' ORDER BY created_at DESC"
      );
      return result.rows.map(this.mapRowToNote);
    } catch (error) {
      throw new AppError('Failed to fetch notes', 500);
    }
  }

  async findById(id: string): Promise<Note | null> {
    try {
      const result = await this.pool.query(
        "SELECT * FROM notes WHERE id = $1 AND status = 'ACTIVE'",
        [id]
      );
      if (result.rows.length === 0) {
        return null;
      }
      return this.mapRowToNote(result.rows[0]);
    } catch (error) {
      throw new AppError('Failed to fetch note', 500);
    }
  }

  async create(dto: CreateNoteDto): Promise<Note> {
    try {
      const result = await this.pool.query(
        'INSERT INTO notes (title, body) VALUES ($1, $2) RETURNING *',
        [dto.title, dto.body]
      );
      return this.mapRowToNote(result.rows[0]);
    } catch (error) {
      throw new AppError('Failed to create note', 500);
    }
  }

  private mapRowToNote(row: any): Note {
    return {
      id: row.id,
      title: row.title,
      body: row.body,
      status: row.status as NoteStatus,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
