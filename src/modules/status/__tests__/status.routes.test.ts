import { statusRouter } from '../status.routes';

describe('Status Routes', () => {
  it('GET /status should return 200 and the correct JSON shape', () => {
    const req = {
      method: 'GET',
      url: '/status',
      path: '/status'
    } as any;

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    } as any;

    const next = jest.fn();

    // Invoke the router directly with mocked req/res
    statusRouter(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: 'ok',
      timestamp: expect.any(String)
    });
  });
});
