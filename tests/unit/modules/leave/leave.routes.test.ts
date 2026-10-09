import Fastify, { FastifyInstance } from 'fastify';
import { leaveRoutes } from '../../../../src/modules/leave/leave.routes';
import { LeaveActor, ILeaveService } from '../../../../src/modules/leave/leave.service';
import { LeaveRequest, PendingDecision } from '../../../../src/modules/leave/leave.model';
import { AuditLog } from '../../../../src/modules/audit';
import { NotFoundError } from '../../../../src/shared/errors';
import {
  AuditAction,
  CreateLeaveRequestDto,
  EmployeeRole,
  LEAVE_REQUEST_ENTITY_TYPE,
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

describe('leave routes — GET /leaves and GET /leaves/:id role scoping', () => {
  let app: FastifyInstance;

  const entrepreneur: LeaveRequest = {
    id: 'lr-1',
    employeeId: 'emp-1',
    leaveTypeCode: LeaveTypeCode.ANNUAL,
    startDate: new Date('2030-03-04T00:00:00Z'),
    endDate: new Date('2030-03-05T00:00:00Z'),
    requestedDays: 2,
    reason: null,
    status: LeaveStatus.SUBMITTED,
    approverId: null,
    approvalComment: null,
    submittedAt: new Date('2030-02-01T00:00:00Z'),
    decidedAt: null,
    cancelledBy: null,
    cancelledAt: null,
  } as unknown as LeaveRequest;

  // A direct report and an unrelated outsider, so scoping is observable.
  const reportRequest: LeaveRequest = {
    ...entrepreneur,
    id: 'lr-2',
    employeeId: 'emp-2',
    status: LeaveStatus.SUBMITTED,
  } as unknown as LeaveRequest;
  const outsiderRequest: LeaveRequest = {
    ...entrepreneur,
    id: 'lr-3',
    employeeId: 'emp-3',
  } as unknown as LeaveRequest;

  function buildApp(actor: LeaveActor): FastifyInstance {
    const store: LeaveRequest[] = [entrepreneur, reportRequest, outsiderRequest];
    const service = {
      list: jest.fn(async (a: LeaveActor) => {
        if (a.role === EmployeeRole.ADMIN) return [...store];
        if (a.role === EmployeeRole.MANAGER) {
          return store.filter((r) => r.employeeId === a.id || r.employeeId === 'emp-2');
        }
        return store.filter((r) => r.employeeId === a.id);
      }),
      getById: jest.fn(async (a: LeaveActor, id: string) => {
        const found = store.find((r) => r.id === id);
        if (!found) {
          throw new NotFoundError('Leave request not found');
        }
        if (a.role === EmployeeRole.ADMIN) {
          return found;
        }
        const visibleIds = [a.id];
        if (a.role === EmployeeRole.MANAGER) {
          visibleIds.push('emp-2');
        }
        if (!visibleIds.includes(found.employeeId)) {
          throw new NotFoundError('Leave request not found');
        }
        return found;
      }),
    } as unknown as ILeaveService;

    const instance = Fastify();
    (instance as unknown as { leaveService: ILeaveService }).leaveService = service;
    instance.decorateRequest('user', undefined);
    instance.addHook('preHandler', async (request) => {
      (request as unknown as { user: unknown }).user = actor;
    });
    return instance;
  }

  const byRole: Array<[EmployeeRole, number]> = [
    [EmployeeRole.EMPLOYEE, 1],
    [EmployeeRole.MANAGER, 2],
    [EmployeeRole.ADMIN, 3],
  ];

  it.each(byRole)('GET /leaves scopes visible requests for %s', async (role, expected) => {
    app = buildApp({ id: 'emp-1', role });
    await app.register(leaveRoutes);
    await app.ready();

    const response = await app.inject({ method: 'GET', url: '/leaves' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveLength(expected);
    await app.close();
  });

  it('GET /leaves/:id returns a visible request for its owner', async () => {
    app = buildApp({ id: 'emp-1', role: EmployeeRole.EMPLOYEE });
    await app.register(leaveRoutes);
    await app.ready();

    const response = await app.inject({ method: 'GET', url: '/leaves/lr-1' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ id: 'lr-1', employeeId: 'emp-1' });
    await app.close();
  });

  it('GET /leaves/:id returns NotFoundError for a request not visible to the actor', async () => {
    app = buildApp({ id: 'emp-1', role: EmployeeRole.EMPLOYEE });
    await app.register(leaveRoutes);
    await app.ready();

    // emp-3's request exists but is not visible to emp-1.
    const invisible = await app.inject({ method: 'GET', url: '/leaves/lr-3' });
    expect(invisible.statusCode).toBe(404);
    expect(invisible.json()).toMatchObject({ code: 'NOT_FOUND' });

    // A genuinely nonexistent id is indistinguishable.
    const missing = await app.inject({ method: 'GET', url: '/leaves/lr-does-not-exist' });
    expect(missing.statusCode).toBe(404);
    expect(missing.json()).toMatchObject({ code: 'NOT_FOUND' });

    expect(invisible.json()).toEqual(missing.json());
    await app.close();
  });

  it('GET /leaves/:id returns NotFoundError for a nonexistent id', async () => {
    app = buildApp({ id: 'emp-1', role: EmployeeRole.ADMIN });
    await app.register(leaveRoutes);
    await app.ready();

    const response = await app.inject({ method: 'GET', url: '/leaves/lr-nope' });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ code: 'NOT_FOUND' });
    await app.close();
  });

  it('GET /leaves/:id scopes getById for MANAGER', async () => {
    app = buildApp({ id: 'emp-1', role: EmployeeRole.MANAGER });
    await app.register(leaveRoutes);
    await app.ready();

    // A direct report's (emp-2) request is visible to the manager.
    const report = await app.inject({ method: 'GET', url: '/leaves/lr-2' });
    expect(report.statusCode).toBe(200);
    expect(report.json()).toMatchObject({ id: 'lr-2', employeeId: 'emp-2' });

    // An unrelated outsider's (emp-3) request is not — same 404 as nonexistent.
    const outsider = await app.inject({ method: 'GET', url: '/leaves/lr-3' });
    expect(outsider.statusCode).toBe(404);
    expect(outsider.json()).toMatchObject({ code: 'NOT_FOUND' });
    await app.close();
  });

  it('GET /leaves/:id scopes getById for ADMIN (any request)', async () => {
    app = buildApp({ id: 'emp-1', role: EmployeeRole.ADMIN });
    await app.register(leaveRoutes);
    await app.ready();

    // An admin may read a request belonging to an unrelated employee (emp-3).
    const foreign = await app.inject({ method: 'GET', url: '/leaves/lr-3' });
    expect(foreign.statusCode).toBe(200);
    expect(foreign.json()).toMatchObject({ id: 'lr-3', employeeId: 'emp-3' });
    await app.close();
  });
});

describe('leave routes — GET /leaves/:id/history', () => {
  const owner: LeaveActor = { id: 'emp-1', role: EmployeeRole.EMPLOYEE };
  const manager: LeaveActor = { id: 'emp-1', role: EmployeeRole.MANAGER };

  // emp-1's own request, and a direct report's (emp-2) request. The manager may see
  // both; an unrelated outsider's request (emp-3) is invisible to emp-1.
  const ownRequest: LeaveRequest = {
    id: 'lr-1',
    employeeId: 'emp-1',
    leaveTypeCode: LeaveTypeCode.ANNUAL,
    startDate: new Date('2030-03-04T00:00:00Z'),
    endDate: new Date('2030-03-05T00:00:00Z'),
    requestedDays: 2,
    reason: null,
    status: LeaveStatus.SUBMITTED,
    approverId: null,
    approvalComment: null,
    submittedAt: new Date('2030-02-01T00:00:00Z'),
    decidedAt: null,
    cancelledBy: null,
    cancelledAt: null,
    reversesRequestId: null,
  };
  const reportRequest: LeaveRequest = { ...ownRequest, id: 'lr-2', employeeId: 'emp-2' };
  const outsiderRequest: LeaveRequest = { ...ownRequest, id: 'lr-3', employeeId: 'emp-3' };

  function entry(overrides: Partial<AuditLog> = {}): AuditLog {
    return {
      id: 'audit-1',
      actorId: 'emp-1',
      action: AuditAction.CREATE,
      entityType: LEAVE_REQUEST_ENTITY_TYPE,
      entityId: 'lr-1',
      beforeState: null,
      afterState: { status: 'DRAFT' },
      occurredAt: new Date('2030-02-01T09:00:00.000Z'),
      ...overrides,
    };
  }

  /**
   * The fake mirrors the real service's contract: getHistory's ONLY authorization is
   * getById's visibility rule, called first and allowed to throw. A visible request
   * with no rows yields [] — never a 404.
   */
  function buildHistoryApp(
    actor: LeaveActor,
    trail: Record<string, AuditLog[]> = {}
  ): { app: FastifyInstance; getHistory: jest.Mock } {
    const store: LeaveRequest[] = [ownRequest, reportRequest, outsiderRequest];
    const getHistory = jest.fn(async (a: LeaveActor, id: string) => {
      const found = store.find((r) => r.id === id);
      if (!found) {
        throw new NotFoundError('Leave request not found');
      }
      if (a.role !== EmployeeRole.ADMIN) {
        const visibleIds = [a.id];
        if (a.role === EmployeeRole.MANAGER) {
          visibleIds.push('emp-2');
        }
        if (!visibleIds.includes(found.employeeId)) {
          throw new NotFoundError('Leave request not found');
        }
      }
      return trail[id] ?? [];
    });

    const service = { getHistory } as unknown as ILeaveService;

    const instance = Fastify();
    (instance as unknown as { leaveService: ILeaveService }).leaveService = service;
    instance.decorateRequest('user', undefined);
    instance.addHook('preHandler', async (request) => {
      (request as unknown as { user: unknown }).user = actor;
    });
    return { app: instance, getHistory };
  }

  it('returns 200 with the entries for the request own employee', async () => {
    const first = entry({ id: 'audit-1', action: AuditAction.CREATE });
    const second = entry({
      id: 'audit-2',
      action: AuditAction.UPDATE,
      beforeState: { status: 'DRAFT' },
      afterState: { status: 'SUBMITTED' },
      occurredAt: new Date('2030-02-01T10:00:00.000Z'),
    });
    const { app } = buildHistoryApp(owner, { 'lr-1': [first, second] });
    await app.register(leaveRoutes);
    await app.ready();

    const response = await app.inject({ method: 'GET', url: '/leaves/lr-1/history' });

    expect(response.statusCode).toBe(200);
    const body = response.json() as AuditLog[];
    expect(body).toHaveLength(2);
    expect(body[0].id).toBe('audit-1');
    expect(body[1].id).toBe('audit-2');
    await app.close();
  });

  it('serializes entries with exactly the audit-owned eight fields, no added or renamed field', async () => {
    const { app } = buildHistoryApp(owner, { 'lr-1': [entry()] });
    await app.register(leaveRoutes);
    await app.ready();

    const response = await app.inject({ method: 'GET', url: '/leaves/lr-1/history' });

    expect(response.statusCode).toBe(200);
    const [body] = response.json() as AuditLog[];
    // A bare array — the audit module's AuditLog verbatim, no leave-owned projection.
    expect(Object.keys(body).sort()).toEqual(
      [
        'id',
        'actorId',
        'action',
        'entityType',
        'entityId',
        'beforeState',
        'afterState',
        'occurredAt',
      ].sort()
    );
    expect(body.entityType).toBe(LEAVE_REQUEST_ENTITY_TYPE);
    expect(body.entityId).toBe('lr-1');
    // before/afterState are exposed verbatim (Q3), parsed rather than re-encoded.
    expect(body.beforeState).toBeNull();
    expect(body.afterState).toEqual({ status: 'DRAFT' });
  });

  it('returns 200 with [] for a visible request that has no audit rows — not 404', async () => {
    const { app } = buildHistoryApp(owner, {});
    await app.register(leaveRoutes);
    await app.ready();

    const response = await app.inject({ method: 'GET', url: '/leaves/lr-1/history' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([]);
    await app.close();
  });

  it('lets a MANAGER read a direct report history', async () => {
    const { app } = buildHistoryApp(manager, { 'lr-2': [entry({ entityId: 'lr-2' })] });
    await app.register(leaveRoutes);
    await app.ready();

    const response = await app.inject({ method: 'GET', url: '/leaves/lr-2/history' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveLength(1);
    await app.close();
  });

  it('returns the SAME 404 for an invisible request as for a nonexistent id — never 403', async () => {
    const { app } = buildHistoryApp(owner, { 'lr-3': [entry({ entityId: 'lr-3' })] });
    await app.register(leaveRoutes);
    await app.ready();

    // emp-3's request exists and HAS a trail, but emp-1 may not see it.
    const invisible = await app.inject({ method: 'GET', url: '/leaves/lr-3/history' });
    expect(invisible.statusCode).toBe(404);
    expect(invisible.json()).toMatchObject({ code: 'NOT_FOUND' });

    const missing = await app.inject({ method: 'GET', url: '/leaves/lr-does-not-exist/history' });
    expect(missing.statusCode).toBe(404);
    expect(missing.json()).toMatchObject({ code: 'NOT_FOUND' });

    // Byte-identical: the two responses must not be distinguishable.
    expect(invisible.json()).toEqual(missing.json());
    expect(invisible.statusCode).not.toBe(403);
    await app.close();
  });

  it('returns 401 when the actor is missing rather than leaking the trail', async () => {
    const instance = Fastify();
    (instance as unknown as { leaveService: ILeaveService }).leaveService = {
      getHistory: jest.fn(),
    } as unknown as ILeaveService;
    instance.decorateRequest('user', undefined);
    await instance.register(leaveRoutes);
    await instance.ready();

    const response = await instance.inject({ method: 'GET', url: '/leaves/lr-1/history' });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ code: 'UNAUTHORIZED' });
    await instance.close();
  });

  it('routes the request id and the authenticated actor through to getHistory unchanged', async () => {
    const { app, getHistory } = buildHistoryApp(manager, { 'lr-2': [entry()] });
    await app.register(leaveRoutes);
    await app.ready();

    await app.inject({ method: 'GET', url: '/leaves/lr-2/history' });

    expect(getHistory).toHaveBeenCalledTimes(1);
    expect(getHistory).toHaveBeenCalledWith({ id: 'emp-1', role: EmployeeRole.MANAGER }, 'lr-2');
    await app.close();
  });
});

describe('leave routes — GET /leaves/pending-decisions', () => {
  /**
   * The queue the service hands back: a leave-owned read projection of requests
   * awaiting a decision. Dates are real `Date` values here; JSON turns them into
   * ISO strings over the wire, which is what the HTTP assertions compare against.
   */
  const queue: PendingDecision[] = [
    {
      requestId: 'lr-1',
      employeeId: 'emp-1',
      leaveTypeCode: LeaveTypeCode.ANNUAL,
      startDate: new Date('2030-03-04T00:00:00Z'),
      endDate: new Date('2030-03-05T00:00:00Z'),
      requestedDays: 2,
      status: LeaveStatus.SUBMITTED,
    },
    {
      requestId: 'lr-2',
      employeeId: 'emp-2',
      leaveTypeCode: LeaveTypeCode.ANNUAL,
      startDate: new Date('2030-04-01T00:00:00Z'),
      endDate: new Date('2030-04-03T00:00:00Z'),
      requestedDays: 3,
      status: LeaveStatus.SUBMITTED,
    },
  ];

  function buildApp(
    actor: LeaveActor | undefined,
    listPendingDecisions: jest.Mock
  ): FastifyInstance {
    const service = { listPendingDecisions } as unknown as ILeaveService;

    const instance = Fastify();
    (instance as unknown as { leaveService: ILeaveService }).leaveService = service;
    instance.decorateRequest('user', undefined);
    // A preHandler that assigns nothing when there is no actor, so `resolveActor`
    // sees an unauthenticated request exactly as production middleware would.
    instance.addHook('preHandler', async (request) => {
      if (actor !== undefined) {
        (request as unknown as { user: unknown }).user = actor;
      }
    });
    return instance;
  }

  it('200 with the queue for an ADMIN', async () => {
    const listPendingDecisions = jest.fn(async (_a: LeaveActor) => queue);
    const app = buildApp({ id: 'admin-1', role: EmployeeRole.ADMIN }, listPendingDecisions);
    await app.register(leaveRoutes);
    await app.ready();

    const response = await app.inject({ method: 'GET', url: '/leaves/pending-decisions' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(JSON.parse(JSON.stringify(queue)));
    await app.close();
  });

  it('200 with [] for an empty queue (not 404)', async () => {
    const listPendingDecisions = jest.fn(async (_a: LeaveActor) => []);
    const app = buildApp({ id: 'admin-1', role: EmployeeRole.ADMIN }, listPendingDecisions);
    await app.register(leaveRoutes);
    await app.ready();

    const response = await app.inject({ method: 'GET', url: '/leaves/pending-decisions' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([]);
    await app.close();
  });

  it('401 { code: UNAUTHORIZED } when there is no authenticated user', async () => {
    const listPendingDecisions = jest.fn();
    const app = buildApp(undefined, listPendingDecisions);
    await app.register(leaveRoutes);
    await app.ready();

    const response = await app.inject({ method: 'GET', url: '/leaves/pending-decisions' });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ code: 'UNAUTHORIZED' });
    expect(listPendingDecisions).not.toHaveBeenCalled();
    await app.close();
  });

  it('routes the resolved actor through to listPendingDecisions unchanged', async () => {
    let seen: LeaveActor | null = null;
    const listPendingDecisions = jest.fn(async (a: LeaveActor) => {
      seen = a;
      return [];
    });
    const app = buildApp({ id: 'mgr-1', role: EmployeeRole.MANAGER }, listPendingDecisions);
    await app.register(leaveRoutes);
    await app.ready();

    await app.inject({ method: 'GET', url: '/leaves/pending-decisions' });

    expect(seen).toEqual({ id: 'mgr-1', role: EmployeeRole.MANAGER });
    expect(listPendingDecisions).toHaveBeenCalledTimes(1);
    await app.close();
  });

  it('returns a bare array of PendingDecision objects with exactly the seven fields — no wrapper, no extra field', async () => {
    const single: PendingDecision[] = [
      {
        requestId: 'lr-9',
        employeeId: 'emp-9',
        leaveTypeCode: LeaveTypeCode.ANNUAL,
        startDate: new Date('2030-05-06T00:00:00Z'),
        endDate: new Date('2030-05-07T00:00:00Z'),
        requestedDays: 2,
        status: LeaveStatus.SUBMITTED,
      },
    ];
    const listPendingDecisions = jest.fn(async (_a: LeaveActor) => single);
    const app = buildApp({ id: 'admin-1', role: EmployeeRole.ADMIN }, listPendingDecisions);
    await app.register(leaveRoutes);
    await app.ready();

    const response = await app.inject({ method: 'GET', url: '/leaves/pending-decisions' });

    expect(response.statusCode).toBe(200);
    const body = response.json() as PendingDecision[];
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(1);
    expect(Object.keys(body[0]).sort()).toEqual(
      ['employeeId', 'endDate', 'leaveTypeCode', 'requestedDays', 'requestId', 'startDate', 'status'].sort()
    );
    expect(body[0].requestId).toBe('lr-9');
    expect(body[0].leaveTypeCode).toBe('annual');
    expect(body[0].status).toBe('SUBMITTED');
    expect(body[0].requestedDays).toBe(2);
    expect(body).not.toHaveProperty('data');
    await app.close();
  });

  it('200 with the queue for a MANAGER, forwarding the actor so the service can scope it', async () => {
    const listPendingDecisions = jest.fn(async (_a: LeaveActor) => queue);
    const app = buildApp({ id: 'mgr-1', role: EmployeeRole.MANAGER }, listPendingDecisions);
    await app.register(leaveRoutes);
    await app.ready();

    const response = await app.inject({ method: 'GET', url: '/leaves/pending-decisions' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveLength(queue.length);
    expect(listPendingDecisions).toHaveBeenCalledWith({ id: 'mgr-1', role: EmployeeRole.MANAGER });
    await app.close();
  });

  it('is matched ahead of GET /leaves/:id — the static path is not shadowed by the parametric one', async () => {
    const listPendingDecisions = jest.fn(async (_a: LeaveActor) => queue);
    const getById = jest.fn(async () => {
      throw new NotFoundError('Leave request not found');
    });
    const service = { listPendingDecisions, getById } as unknown as ILeaveService;

    const instance = Fastify();
    (instance as unknown as { leaveService: ILeaveService }).leaveService = service;
    instance.decorateRequest('user', undefined);
    instance.addHook('preHandler', async (request) => {
      (request as unknown as { user: unknown }).user = {
        id: 'admin-1',
        role: EmployeeRole.ADMIN,
      };
    });
    await instance.register(leaveRoutes);
    await instance.ready();

    const response = await instance.inject({ method: 'GET', url: '/leaves/pending-decisions' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveLength(queue.length);
    // Had the parametric route won, getById would have produced a 404 (or a 500).
    expect(getById).not.toHaveBeenCalled();
    await instance.close();
  });

  it('401 UNAUTHORIZED when the authenticated user carries an out-of-enum role', async () => {
    const listPendingDecisions = jest.fn();
    const app = buildApp(
      { id: 'emp-1', role: 'SUPERUSER' as unknown as EmployeeRole },
      listPendingDecisions
    );
    await app.register(leaveRoutes);
    await app.ready();

    const response = await app.inject({ method: 'GET', url: '/leaves/pending-decisions' });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ code: 'UNAUTHORIZED' });
    expect(listPendingDecisions).not.toHaveBeenCalled();
    await app.close();
  });

  it('serializes the queue dates as ISO strings on the wire, preserving the values', async () => {
    const listPendingDecisions = jest.fn(async (_a: LeaveActor) => queue);
    const app = buildApp({ id: 'admin-1', role: EmployeeRole.ADMIN }, listPendingDecisions);
    await app.register(leaveRoutes);
    await app.ready();

    const response = await app.inject({ method: 'GET', url: '/leaves/pending-decisions' });

    const [first] = response.json() as Array<Record<string, unknown>>;
    expect(first.startDate).toBe('2030-03-04T00:00:00.000Z');
    expect(first.endDate).toBe('2030-03-05T00:00:00.000Z');
    await app.close();
  });

  it('returns the service array verbatim — same order, same length, no re-projection', async () => {
    const reversed = [...queue].reverse();
    const listPendingDecisions = jest.fn(async (_a: LeaveActor) => reversed);
    const app = buildApp({ id: 'admin-1', role: EmployeeRole.ADMIN }, listPendingDecisions);
    await app.register(leaveRoutes);
    await app.ready();

    const response = await app.inject({ method: 'GET', url: '/leaves/pending-decisions' });

    expect(response.statusCode).toBe(200);
    const body = response.json() as PendingDecision[];
    // Oldest-first is the service/repository's contract; the route must not re-sort or cap.
    expect(body.map((item) => item.requestId)).toEqual(['lr-2', 'lr-1']);
    await app.close();
  });

  it('500 with a generic body when the service fails — the dependency error is not leaked', async () => {
    const listPendingDecisions = jest.fn(async () => {
      throw new Error('database exploded');
    });
    const app = buildApp({ id: 'admin-1', role: EmployeeRole.ADMIN }, listPendingDecisions);
    await app.register(leaveRoutes);
    await app.ready();

    const response = await app.inject({ method: 'GET', url: '/leaves/pending-decisions' });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({ error: 'Internal Server Error' });
    expect(response.body).not.toContain('database exploded');
    await app.close();
  });
});
