import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../../app';
import { auditLog } from '../../shared/utils/audit-log';

vi.mock('../../shared/utils/audit-log');

describe('SC-4: Audit Log for State-Changing Operations', () => {
  it('should create an audit log for POST /leave-requests', async () => {
    await request(app).post('/leave-requests').send({
      employeeId: '123',
      startDate: '2023-01-01',
      endDate: '2023-01-10',
      reason: 'Vacation',
      status: 'pending'
    });
    expect(auditLog).toHaveBeenCalled();
  });
});