import { describe, it, expect } from 'vitest';
import { createAuthMiddleware, validateToken, logoutFromService, revokeToken } from '../../shared/sdk';

describe('Server SDK', () => {
  const mockAuthServerUrl = 'http://localhost:3000';

  describe('createAuthMiddleware', () => {
    it('should create middleware function', () => {
      const middleware = createAuthMiddleware({
        authServerUrl: mockAuthServerUrl,
      });

      expect(typeof middleware).toBe('function');
    });

    it('should reject requests without authorization header', () => {
      const middleware = createAuthMiddleware({
        authServerUrl: mockAuthServerUrl,
      });

      const mockReq = {
        headers: {},
      };

      const mockRes = {
        status: function(code: number) {
          expect(code).toBe(401);
          return this;
        },
        json: function(data: any) {
          expect(data.success).toBe(false);
          expect(data.error.code).toBe('UNAUTHORIZED');
        },
      };

      const mockNext = function() {};

      // @ts-ignore - mock objects
      middleware(mockReq, mockRes, mockNext);
    });
  });

  describe('validateToken', () => {
    it('should return invalid result for empty token', async () => {
      const result = await validateToken('', mockAuthServerUrl);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle network errors gracefully', async () => {
      // This will fail because server is not running in tests
      const result = await validateToken('invalid-token', mockAuthServerUrl);

      expect(result.valid).toBe(false);
    });
  });

  describe('logoutFromService', () => {
    it('should return false for invalid token', async () => {
      const result = await logoutFromService(mockAuthServerUrl, 'invalid-token', 1);
      expect(result).toBe(false);
    });
  });

  describe('revokeToken', () => {
    it('should return false for invalid token', async () => {
      const result = await revokeToken(
        'invalid-token',
        mockAuthServerUrl,
        'test-client',
        'test-secret'
      );

      expect(result).toBe(false);
    });
  });
});
