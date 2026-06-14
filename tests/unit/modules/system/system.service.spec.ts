import { SystemService } from '../../../../src/modules/system/system.service';

describe('SystemService', () => {
  const systemService = new SystemService();

  describe('getProcessInfo', () => {
    it('should return process info with pid', async () => {
      const result = await systemService.getProcessInfo();
      
      expect(result).toHaveProperty('pid');
      expect(typeof result.pid).toBe('number');
      expect(result.pid).toBeGreaterThan(0);
    });
  });
});
