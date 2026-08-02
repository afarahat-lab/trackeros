import { pool } from '../db/connection';
import type { Holiday } from './holiday.model';

interface HolidayRow {
  id: string;
  date: Date;
  name: string;
  country: string;
}

function rowToHoliday(row: HolidayRow): Holiday {
  const dateStr = row.date.toISOString().split('T')[0];
  const [year, month, day] = dateStr.split('-').map(Number);
  return {
    id: row.id,
    date: new Date(year, month - 1, day),
    name: row.name,
    country: row.country,
  };
}

export interface IHolidayRepository {
  findByDateRange(startDate: Date, endDate: Date): Promise<Holiday[]>;
  findByYear(year: number): Promise<Holiday[]>;
}

export class PgHolidayRepository implements IHolidayRepository {
  async findByDateRange(startDate: Date, endDate: Date): Promise<Holiday[]> {
    const result = await pool.query<HolidayRow>(
      'SELECT * FROM holidays WHERE date >= $1 AND date <= $2 ORDER BY date',
      [startDate, endDate],
    );
    return result.rows.map(rowToHoliday);
  }

  async findByYear(year: number): Promise<Holiday[]> {
    const result = await pool.query<HolidayRow>(
      'SELECT * FROM holidays WHERE EXTRACT(YEAR FROM date) = $1 ORDER BY date',
      [year],
    );
    return result.rows.map(rowToHoliday);
  }
}
