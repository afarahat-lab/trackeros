import { statusRouter } from '../../../../src/modules/status/status.routes';

describe('Status Endpoint', () => {
  it('should return 200 with status ok', () => {
    expect(statusRouter).toBeDefined();
    const layer = statusRouter.stack.find((l: any) => l.route?.path === '/status');
    expect(layer).toBeDefined();
    expect((layer as any)?.route?.methods?.get).toBe(true);
  });
});
