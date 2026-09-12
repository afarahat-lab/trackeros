import Fastify, { FastifyInstance } from 'fastify';
import { leaveRoutes } from '../../../../src/modules/leave/leave.routes';
import { LeaveActor, ILeaveService } from '../../../../src/modules/leave/leave.service';
import { LeaveRequest } from '../../../../src/modules/leave/leave.model';
import {
  CreateLeaveRequestDto,
  EmployeeRole,
  LeaveStatus,
  LeaveTypeCode,
} from '../../../../src/shared/types';

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
    const service = {
      create: jest.fn(async (_a: LeaveActor, dto: CreateLeaveRequestDto) => {
        received = dto;
        return created;
      }),
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
});
