import { statusRoutes } from '../../../../src/modules/status/status.routes';
import { StatusService } from '../../../../src/modules/status/status.service';

jest.mock('../../../../src/modules/status/status.service', () => ({
  StatusService: jest.fn().mockImplementation(() => ({
    getStatus: jest.fn(),
  })),
}));

describe('statusRoutes', () => {
  let mockGetStatus: jest.Mock;
  let mockReq: any;
  let mockRes: any;
  let handler: any;

  beforeEach(() => {
    mockGetStatus = jest.fn();
    (StatusService as jest.Mock).mockImplementation(() => ({
      getStatus: mockGetStatus,
    }));

    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    const layer = (statusRoutes as any).stack.find((l: any) => l.route && l.route.path === '/status');
    handler = layer.route.stack[0].handle;
  });

  it('should return 200 with { up: true, version: "1" } when service succeeds', async () => {
    mockGetStatus.mockReturnValue({ up: true, version: '1' });

    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.send).toHaveBeenCalledWith({ up: true, version: '1' });
  });

  it('should return 500 with { up: false, version: "1" } when service throws', async () => {
    mockGetStatus.mockImplementation(() => {
      throw new Error('Service failure');
    });

    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.send).toHaveBeenCalledWith({ up: false, version: '1' });
  });
});
