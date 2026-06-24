import { Request, Response, NextFunction } from 'express';
import { statusRouter } from '../../../../src/modules/status/status.routes';

describe('Status Endpoint', () => {
  it('should return 200 with status ok', () => {
    const req = {} as Request;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;
    const next = jest.fn() as unknown as NextFunction;

    const layer = statusRouter.stack.find((l: any) => l.route?.path === '/status');
    layer?.route?.stack[0].handle(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        up: true,
        version: '1',
      })
    );
  });
});
