import Fastify, { FastifyInstance } from 'fastify';
import { statusRoutes } from '../status.routes';
import { StatusService } from '../status.service';

jest.mock('../status.service', () => ({
  StatusService: jest.fn().mockImplementation(() => ({
    getStatus: jest.fn(),
  })),
}));

const MockedStatusService = StatusService as jest.MockedClass<typeof StatusService>;

describe('statusRoutes', () => {
  let app: FastifyInstance;
  let mockGetStatus: jest.Mock;

  beforeEach(async () => {
    mockGetStatus = jest.fn();
    MockedStatusService.mockImplementation(() => ({
      getStatus: mockGetStatus,
    } as unknown as StatusService));

    app = Fastify();
    await app.register(statusRoutes);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should return 200 with { up: true, version: "1" } when service succeeds', async () => {
    mockGetStatus.mockReturnValue({ up: true, version: '1' });
    const response = await app.inject({ method: 'GET', url: '/status' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ up: true, version: '1' });
  });

  it('should return 500 with { up: false, version: "1" } when service throws', async () => {
    mockGetStatus.mockImplementation(() => {
      throw new Error('Service failure');
    });
    const response = await app.inject({ method: 'GET', url: '/status' });
    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({ up: false, version: '1' });
  });
});
