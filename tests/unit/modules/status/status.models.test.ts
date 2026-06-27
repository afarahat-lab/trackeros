import { HealthStatus } from '../../../../src/modules/status/health.model';
import { VersionInfo } from '../../../../src/modules/status/version.model';
import { IHealthService } from '../../../../src/modules/status/health.service.interface';
import { IVersionService } from '../../../../src/modules/status/version.service.interface';
import { IHealthRepository } from '../../../../src/modules/status/health.repository.interface';

describe('Status module models and interfaces', () => {
  describe('HealthStatus', () => {
    it('should allow creating a valid HealthStatus object', () => {
      const health: HealthStatus = {
        isHealthy: true,
        timestamp: new Date('2024-01-01'),
        version: '1.0.0',
        uptimeSeconds: 3600,
      };

      expect(health.isHealthy).toBe(true);
      expect(health.timestamp).toBeInstanceOf(Date);
      expect(health.version).toBe('1.0.0');
      expect(health.uptimeSeconds).toBe(3600);
    });

    it('should allow isHealthy to be false', () => {
      const health: HealthStatus = {
        isHealthy: false,
        timestamp: new Date(),
        version: '1.0.0',
        uptimeSeconds: 0,
      };

      expect(health.isHealthy).toBe(false);
    });
  });

  describe('VersionInfo', () => {
    it('should allow creating a valid VersionInfo object', () => {
      const version: VersionInfo = {
        version: '1.0.0',
        buildNumber: '42',
        commitHash: 'abc123',
        buildDate: new Date('2024-01-01'),
      };

      expect(version.version).toBe('1.0.0');
      expect(version.buildNumber).toBe('42');
      expect(version.commitHash).toBe('abc123');
      expect(version.buildDate).toBeInstanceOf(Date);
    });
  });

  describe('IHealthService', () => {
    it('should be importable and define getHealth method', () => {
      const mockService: IHealthService = {
        getHealth: jest.fn().mockResolvedValue({
          isHealthy: true,
          timestamp: new Date(),
          version: '1.0.0',
          uptimeSeconds: 100,
        }),
      };

      expect(typeof mockService.getHealth).toBe('function');
    });
  });

  describe('IVersionService', () => {
    it('should be importable and define getVersion method', () => {
      const mockService: IVersionService = {
        getVersion: jest.fn().mockReturnValue({
          version: '1.0.0',
          buildNumber: '42',
          commitHash: 'abc123',
          buildDate: new Date(),
        }),
      };

      expect(typeof mockService.getVersion).toBe('function');
    });
  });

  describe('IHealthRepository', () => {
    it('should be importable and define checkDatabaseConnection method', () => {
      const mockRepo: IHealthRepository = {
        checkDatabaseConnection: jest.fn().mockResolvedValue(true),
      };

      expect(typeof mockRepo.checkDatabaseConnection).toBe('function');
    });
  });
});
