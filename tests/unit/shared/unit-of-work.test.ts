import type { Pool } from 'pg';
import { PgUnitOfWork } from '../../../src/shared/db/unit-of-work';

interface FakeClient {
  query: jest.Mock;
  release: jest.Mock;
}

describe('PgUnitOfWork.withTransaction', () => {
  let client: FakeClient;
  let pool: unknown;

  beforeEach(() => {
    client = {
      query: jest.fn().mockResolvedValue(undefined),
      release: jest.fn(),
    };
    pool = { connect: jest.fn().mockResolvedValue(client) };
  });

  it('issues BEGIN, runs the callback, COMMITs, and releases', async () => {
    const work = jest.fn().mockResolvedValue('result');
    const uow = new PgUnitOfWork(pool as Pool);

    const result = await uow.withTransaction(work);

    expect(result).toBe('result');
    expect(client.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(work).toHaveBeenCalledWith(client);
    expect(client.query).toHaveBeenNthCalledWith(2, 'COMMIT');
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it('ROLLBACKs and re-throws on callback error, still releasing the client', async () => {
    const boom = new Error('boom');
    const work = jest.fn().mockRejectedValue(boom);
    const uow = new PgUnitOfWork(pool as Pool);

    await expect(uow.withTransaction(work)).rejects.toBe(boom);

    expect(client.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(client.query).toHaveBeenNthCalledWith(2, 'ROLLBACK');
    expect(client.query).not.toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it('still releases the client when BEGIN itself fails', async () => {
    client.query.mockRejectedValueOnce(new Error('connection'));
    const work = jest.fn();
    const uow = new PgUnitOfWork(pool as Pool);

    await expect(uow.withTransaction(work)).rejects.toThrow('connection');
    expect(client.release).toHaveBeenCalledTimes(1);
  });
});
