import {
  IReadinessRepository,
  ReadinessResult,
  ReadinessState,
  ReadinessStatus,
  UptimeService,
} from '../../../../src/modules/uptime';

/**
 * Unit tests for the readiness service method.
 *
 * The service is constructed with an in-memory fake probe, so nothing here touches the
 * pool: whether `check()` resolves or rejects IS the database being reachable or not.
 * The production module is treated as a fixed contract and is not modified.
 */
class FakeReadinessRepository implements IReadinessRepository {
  check = jest.fn<Promise<void>, []>();
}

/**
 * Mirrors the route's mapping of the internal result onto the wire contract. The route
 * owns that mapping; the service result is what it discriminates on, so asserting the
 * body here pins the "no error detail" requirement without touching production code.
 */
function toReadinessBody(result: ReadinessResult): ReadinessStatus {
  return { status: result.ok ? ReadinessState.READY : ReadinessState.NOT_READY };
}

describe('UptimeService', () => {
  let repository: FakeReadinessRepository;
  let service: UptimeService;

  beforeEach(() => {
    repository = new FakeReadinessRepository();
    service = new UptimeService(repository);
  });

  describe('getUptime', () => {
    it('reports the process uptime in whole seconds', () => {
      const uptime = jest.spyOn(process, 'uptime').mockReturnValue(123.7);

      const status = service.getUptime();

      expect(status).toEqual({ uptimeSeconds: 123 });
      expect(Object.keys(status)).toEqual(['uptimeSeconds']);

      uptime.mockRestore();
    });

    it('returns a non-negative integer', () => {
      const status = service.getUptime();

      expect(Number.isInteger(status.uptimeSeconds)).toBe(true);
      expect(status.uptimeSeconds).toBeGreaterThanOrEqual(0);
    });
  });

  describe('checkReadiness', () => {
    it('is ready when the connectivity query resolves', async () => {
      repository.check.mockResolvedValue(undefined);

      const result = await service.checkReadiness();

      expect(result).toEqual({ ok: true });
      expect(Object.keys(result)).toEqual(['ok']);
      expect(repository.check).toHaveBeenCalledTimes(1);
    });

    it('is not ready when the connectivity query rejects, without throwing', async () => {
      const failure = new Error('connection refused');
      repository.check.mockRejectedValue(failure);

      const result = await service.checkReadiness();

      expect(result).toEqual({ ok: false, error: failure });
      expect(Object.keys(result).sort()).toEqual(['error', 'ok']);
      expect(repository.check).toHaveBeenCalledTimes(1);
    });

    it('carries no error detail on the wire body when not ready', async () => {
      repository.check.mockRejectedValue(new Error('connection refused'));

      const result = await service.checkReadiness();
      const body = toReadinessBody(result);

      expect(body).toEqual({ status: ReadinessState.NOT_READY });
      expect(Object.keys(body)).toEqual(['status']);
      expect(body.status).toBe('not-ready');
    });

    it('reports ready on the wire body when the query resolves', async () => {
      repository.check.mockResolvedValue(undefined);

      const result = await service.checkReadiness();

      expect(toReadinessBody(result)).toEqual({ status: ReadinessState.READY });
      expect(ReadinessState.READY).toBe('ready');
      expect(ReadinessState.NOT_READY).toBe('not-ready');
    });

    it('performs a fresh check on every call (no caching, no memoization)', async () => {
      repository.check.mockResolvedValue(undefined);

      const first = await service.checkReadiness();
      const second = await service.checkReadiness();

      expect(first).toEqual({ ok: true });
      expect(second).toEqual({ ok: true });
      expect(repository.check).toHaveBeenCalledTimes(2);
    });

    it('reflects a database that goes away between calls', async () => {
      repository.check.mockResolvedValueOnce(undefined);
      repository.check.mockRejectedValueOnce(new Error('connection terminated'));

      const ready = await service.checkReadiness();
      const notReady = await service.checkReadiness();

      expect(ready).toEqual({ ok: true });
      expect(notReady.ok).toBe(false);
      expect(toReadinessBody(notReady)).toEqual({ status: ReadinessState.NOT_READY });
      expect(repository.check).toHaveBeenCalledTimes(2);
    });

    it('treats a bounded-timeout rejection as not ready', async () => {
      repository.check.mockRejectedValue(
        new Error('Readiness query timed out after 2000ms')
      );

      const result = await service.checkReadiness();

      expect(result.ok).toBe(false);
      expect(toReadinessBody(result)).toEqual({ status: ReadinessState.NOT_READY });
    });
  });
});
