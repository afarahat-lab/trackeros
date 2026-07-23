import { KnexLeaveTypeRepository } from '../../../../src/modules/leave/leave.repository';
import { LeaveType } from '../../../../src/modules/leave/leave.model';

function makeRow(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    id: '550e8400-e29b-41d4-a716-446655440000',
    code: 'annual',
    label: 'Annual Leave',
    description: 'Standard annual leave',
    is_active: true,
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function expectedLeaveType(overrides: Partial<LeaveType> = {}): LeaveType {
  return {
    id: '550e8400-e29b-41d4-a716-446655440000',
    code: 'annual',
    label: 'Annual Leave',
    description: 'Standard annual leave',
    isActive: true,
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function createMockKnex() {
  const builder: Record<string, jest.Mock> = {};
  const methods = ['select', 'where', 'first', 'insert', 'returning'];

  for (const method of methods) {
    builder[method] = jest.fn().mockReturnValue(builder);
  }

  const knexFn = jest.fn().mockReturnValue(builder);
  // Attach builder methods to the function itself for direct calls like db.select(...)
  for (const method of methods) {
    (knexFn as unknown as Record<string, unknown>)[method] = builder[method];
  }

  return { knexFn, builder };
}

describe('KnexLeaveTypeRepository', () => {
  let repo: KnexLeaveTypeRepository;
  let knexFn: jest.Mock;
  let builder: Record<string, jest.Mock>;

  beforeEach(() => {
    const mock = createMockKnex();
    knexFn = mock.knexFn;
    builder = mock.builder;
    jest.clearAllMocks();
    repo = new KnexLeaveTypeRepository(knexFn as unknown as import('knex').Knex);
  });

  describe('findAll', () => {
    it('returns active leave types', async () => {
      const row = makeRow();
      builder.where.mockResolvedValueOnce([row]);

      const result = await repo.findAll();

      expect(knexFn).toHaveBeenCalledWith('leave_types');
      expect(builder.select).toHaveBeenCalledWith('*');
      expect(builder.where).toHaveBeenCalledWith('is_active', true);
      expect(result).toEqual([expectedLeaveType()]);
    });

    it('returns empty array when no active types exist', async () => {
      builder.where.mockResolvedValueOnce([]);

      const result = await repo.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('returns leave type when found', async () => {
      const row = makeRow();
      builder.first.mockResolvedValueOnce(row);

      const result = await repo.findById('550e8400-e29b-41d4-a716-446655440000');

      expect(knexFn).toHaveBeenCalledWith('leave_types');
      expect(builder.where).toHaveBeenCalledWith('id', '550e8400-e29b-41d4-a716-446655440000');
      expect(result).toEqual(expectedLeaveType());
    });

    it('returns null when not found', async () => {
      builder.first.mockResolvedValueOnce(null);

      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByCode', () => {
    it('returns leave type when found by code', async () => {
      const row = makeRow({ code: 'sick' });
      builder.first.mockResolvedValueOnce(row);

      const result = await repo.findByCode('sick');

      expect(knexFn).toHaveBeenCalledWith('leave_types');
      expect(builder.where).toHaveBeenCalledWith('code', 'sick');
      expect(result).toEqual(expectedLeaveType({ code: 'sick' }));
    });

    it('returns null when code not found', async () => {
      builder.first.mockResolvedValueOnce(null);

      const result = await repo.findByCode('unknown');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('creates and returns a new leave type', async () => {
      const input = {
        code: 'sick',
        label: 'Sick Leave',
        description: 'Sick leave',
        isActive: true,
      };
      const row = makeRow({ code: 'sick', label: 'Sick Leave', description: 'Sick leave' });
      builder.returning.mockResolvedValueOnce([row]);

      const result = await repo.create(input);

      expect(knexFn).toHaveBeenCalledWith('leave_types');
      expect(builder.insert).toHaveBeenCalledWith({
        code: 'sick',
        label: 'Sick Leave',
        description: 'Sick leave',
        is_active: true,
      });
      expect(result).toEqual(
        expectedLeaveType({ code: 'sick', label: 'Sick Leave', description: 'Sick leave' }),
      );
    });
  });
});
