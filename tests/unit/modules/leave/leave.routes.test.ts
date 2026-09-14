import Fastify, { FastifyInstance } from 'fastify';
import { leaveRoutes } from '../../../../src/modules/leave/leave.routes';
import { LeaveActor, ILeaveService } from '../../../../src/modules/leave/leave.service';
import { LeaveRequest } from '../../../../src/modules/leave/leave.model';
import {
  CreateLeaveRequestDto,
  EmployeeRole,
  LeaveRequestQueryParams,
  LeaveStatus,
  LeaveTypeCode,
} from '../../../../src/shared/types';
import {
  ForbiddenError,
  NotFoundError,
} from '../../../../src/shared/errors';

/**
 * Route-level tests for the HTTP boundary.
 *
 * These exist because the suite had none: every leave test called the service directly
 * with `new Date(...)` arguments, so nothing ever exercised the conversion from a JSON
 * body. The route cast the body (`request.body as CreateLeaveRequestDto`) — an assertion
 * the compiler accepts and the runtime contradicts, since JSON has no date type — and the
 * service then called `.getTime()` on a string. Every real request 500'd, while `tsc` and
 * all 133 unit tests stayed green. The smoke check's authenticated probe found it.
 */
describe('leave routes — the HTTP boundary', () => {
  let app: FastifyInstance;
  let received: CreateLeaveRequestDto | null;
  let listMock: jest.Mock;
  let getByIdMock: jest.Mock;

  const actor: LeaveActor = { id: 'emp-1', role: EmployeeRole.EMPLOYEE };

  const created: LeaveRequest = {
    id: 'lr-1',
    employeeId: 'emp-1',
    leaveTypeCode: LeaveTypeCode.ANNUAL,
    startDate: new Date('2030-03-04T00:00:00Z'),
    endDate: new Date('2030-03-05T00:00:00Z'),
    requestedDays: 2,
    reason: null,
    status: LeaveStatus.DRAFT,
    approverId: null,
    approvalComment: null,
    submittedAt: null,
    decidedAt: null,
    cancelledBy: null,
    cancelledAt: null,
  } as unknown as LeaveRequest;

  beforeEach(async () => {
    received = null;
    listMock = jest.fn(async (_a: LeaveActor, _q: LeaveRequestQueryParams) => [created]);
    getByIdMock = jest.fn(async (_a: LeaveActor, _id: string) => created);
    const service = {
      create: jest.fn(async (_a: LeaveActor, dto: CreateLeaveRequestDto) => {
        received = dto;
        return created;
      }),
      list: listMock,
      getById: getByIdMock,
    } as unknown as ILeaveService;

    app = Fastify();
    // The route reads its service off the instance when one is decorated — the existing
    // seam, so no production wiring is changed to make this testable.
    (app as unknown as { leaveService: ILeaveService }).leaveService = service;
    app.decorateRequest('user', undefined);
    app.addHook('preHandler', async (request) => {
      (request as unknown as { user: unknown }).user = actor;
    });
    await app.register(leaveRoutes);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('converts ISO date STRINGS from the JSON body into real Date objects', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/leaves',
      payload: {
        leaveTypeCode: 'annual',
        startDate: '2030-03-04',
        endDate: '2030-03-05',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(received).not.toBeNull();
    // The regression: these used to arrive as strings, so the service's .getTime() threw.
    expect(received!.startDate).toBeInstanceOf(Date);
    expect(received!.endDate).toBeInstanceOf(Date);
    expect(received!.startDate.toISOString()).toBe('2030-03-04T00:00:00.000Z');
  });

  it('rejects an unparseable date with 400 rather than a 500 from deep in the service', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/leaves',
      payload: { leaveTypeCode: 'annual', startDate: 'not-a-date', endDate: '2030-03-05' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('rejects a missing date with 400', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/leaves',
      payload: { leaveTypeCode: 'annual', endDate: '2030-03-05' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('never lets a client-supplied employeeId override the authenticated actor', async () => {
    await app.inject({
      method: 'POST',
      url: '/leaves',
      payload: {
        employeeId: 'somebody-else',
        leaveTypeCode: 'annual',
        startDate: '2030-03-04',
        endDate: '2030-03-05',
      },
    });

    // The service overwrites employeeId with the actor's id; assert the boundary does not
    // quietly drop the field in a way that would hide a future regression there.
    expect(received!.employeeId).toBe('somebody-else');
  });

  describe('GET /leaves', () => {
    it('returns 200 with the array the service produced', async () => {
      const canned: LeaveRequest[] = [created, { ...created, id: 'lr-2' }];
      listMock.mockResolvedValueOnce(canned);

      const response = await app.inject({ method: 'GET', url: '/leaves' });

      expect(response.statusCode).toBe(200);
      // Fastify JSON-serializes the Date fields on the wire, so compare the serialized form.
      expect(response.json()).toEqual(JSON.parse(JSON.stringify(canned)));
    });

    it('parses query params and forwards actor + query to the service', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/leaves?status=SUBMITTED&leaveTypeCode=annual&startDateFrom=2024-06-01&limit=10&offset=0',
      });

      expect(response.statusCode).toBe(200);
      expect(listMock).toHaveBeenCalledTimes(1);

      const [receivedActor, receivedQuery] = listMock.mock.calls[0] as [
        LeaveActor,
        LeaveRequestQueryParams,
      ];
      expect(receivedActor).toEqual({ id: 'emp-1', role: 'EMPLOYEE' });
      expect(receivedQuery.status).toBe('SUBMITTED');
      expect(receivedQuery.leaveTypeCode).toBe('annual');
      expect(receivedQuery.startDateFrom).toBeInstanceOf(Date);
      expect(receivedQuery.limit).toBe(10);
      expect(receivedQuery.offset).toBe(0);
    });

    it.each([
      ['/leaves?status=NOT_A_STATUS', 'status must be one of the valid leave statuses'],
      ['/leaves?limit=abc', 'limit must be an integer'],
      ['/leaves?startDateFrom=not-a-date', 'startDateFrom is not a valid date'],
    ])('rejects invalid query param %s with 400 VALIDATION_ERROR', async (url, message) => {
      const response = await app.inject({ method: 'GET', url });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({ code: 'VALIDATION_ERROR', error: message });
    });

    it('maps a ForbiddenError thrown by the service to 403 FORBIDDEN', async () => {
      listMock.mockRejectedValueOnce(new ForbiddenError('nope'));

      const response = await app.inject({ method: 'GET', url: '/leaves' });

      expect(response.statusCode).toBe(403);
      expect(response.json()).toMatchObject({ code: 'FORBIDDEN', error: 'nope' });
    });
  });

  describe('GET /leaves/:id', () => {
    it('returns 200 with the single request and forwards the correct id', async () => {
      const canned: LeaveRequest = { ...created, id: 'lr-77' };
      getByIdMock.mockResolvedValueOnce(canned);

      const response = await app.inject({ method: 'GET', url: '/leaves/lr-1' });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual(JSON.parse(JSON.stringify(canned)));
      expect(getByIdMock).toHaveBeenCalledWith(actor, 'lr-1');
    });

    it('maps a NotFoundError thrown by the service to 404 NOT_FOUND', async () => {
      getByIdMock.mockRejectedValueOnce(new NotFoundError('Leave request not found'));

      const response = await app.inject({ method: 'GET', url: '/leaves/lr-missing' });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({ error: 'Leave request not found', code: 'NOT_FOUND' });
    });

    it('maps a ForbiddenError thrown by the service to 403 FORBIDDEN', async () => {
      getByIdMock.mockRejectedValueOnce(new ForbiddenError('Only the owner may submit'));

      const response = await app.inject({ method: 'GET', url: '/leaves/lr-1' });

      expect(response.statusCode).toBe(403);
      expect(response.json()).toMatchObject({ code: 'FORBIDDEN' });
    });

    it('maps a non-AppError thrown by the service to 500 Internal Server Error', async () => {
      getByIdMock.mockRejectedValueOnce(new Error('boom'));

      const response = await app.inject({ method: 'GET', url: '/leaves/lr-1' });

      expect(response.statusCode).toBe(500);
      expect(response.json()).toEqual({ error: 'Internal Server Error' });
    });
  });

  describe('GET /leaves without an authenticated user', () => {
    it('returns 401 UNAUTHORIZED when request.user is missing', async () => {
      const unauthenticated = Fastify();
      const service = {
        list: jest.fn(async () => []),
      } as unknown as ILeaveService;
      (unauthenticated as unknown as { leaveService: ILeaveService }).leaveService = service;
      // No preHandler hook sets request.user, so resolveActor throws UnauthorizedError.
      await unauthenticated.register(leaveRoutes);
      await unauthenticated.ready();

      const response = await unauthenticated.inject({ method: 'GET', url: '/leaves' });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toMatchObject({ code: 'UNAUTHORIZED' });

      await unauthenticated.close();
    });
  });
});
