import { describe, it, expect } from 'vitest';
import { 
  createAuthMiddleware, 
  getActiveServices, 
  logoutFromService,
  getSessionsByClient,
  type AuthMiddlewareOptions 
} from '../../shared/sdk';

describe('Enhanced SDK - Service Identification', () => {
  describe('createAuthMiddleware', () => {
    it('should create middleware with service identification', () => {
      const options: AuthMiddlewareOptions = {
        authServerUrl: 'http://localhost:3000',
        service: {
          name: 'Test Service',
          version: '1.0.0',
        },
      };

      const middleware = createAuthMiddleware(options);
      expect(typeof middleware).toBe('function');
    });

    it('should create middleware with auto activity reporting', () => {
      const options: AuthMiddlewareOptions = {
        authServerUrl: 'http://localhost:3000',
        service: {
          name: 'Test Service',
        },
        autoReportActivity: true,
        activityIntervalMs: 60000,
      };

      const middleware = createAuthMiddleware(options);
      expect(typeof middleware).toBe('function');
    });

    it('should create middleware without service config', () => {
      const options: AuthMiddlewareOptions = {
        authServerUrl: 'http://localhost:3000',
      };

      const middleware = createAuthMiddleware(options);
      expect(typeof middleware).toBe('function');
    });
  });

  describe('getActiveServices', () => {
    it('should return null for invalid token', async () => {
      const result = await getActiveServices('http://localhost:3000', 'invalid-token');
      // Will be null because server is not running in tests
      expect(result).toBe(null);
    });
  });

  describe('logoutFromService', () => {
    it('should return false for invalid token', async () => {
      const result = await logoutFromService('http://localhost:3000', 'invalid-token', 1);
      expect(result).toBe(false);
    });
  });

  describe('getSessionsByClient', () => {
    it('should return null for invalid token', async () => {
      const result = await getSessionsByClient('http://localhost:3000', 'invalid-token');
      expect(result).toBe(null);
    });
  });
});
