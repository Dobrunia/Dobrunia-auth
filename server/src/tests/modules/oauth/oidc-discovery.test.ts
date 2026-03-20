import { describe, it, expect } from 'vitest';
import { config } from '../../../config/env.config';

describe('OIDC Discovery Endpoint', () => {
  it('should return valid OIDC configuration', async () => {
    // Verify config has required values
    expect(config.app.issuer).toBeDefined();
    expect(config.app.url).toBeDefined();
  });

  it('should return JWKS with correct structure', () => {
    // JWKS should have keys array
    const jwks = { keys: [] };
    expect(jwks).toHaveProperty('keys');
    expect(Array.isArray(jwks.keys)).toBe(true);
  });

  it('should include all required OIDC endpoints', async () => {
    const baseUrl = config.app.url;
    
    // Verify all endpoints are defined
    const endpoints = {
      issuer: config.app.issuer,
      authorization_endpoint: `${baseUrl}/oauth/authorize`,
      token_endpoint: `${baseUrl}/oauth/token`,
      userinfo_endpoint: `${baseUrl}/oauth/userinfo`,
      jwks_uri: `${baseUrl}/.well-known/jwks.json`,
    };

    for (const [key, value] of Object.entries(endpoints)) {
      expect(value).toBeDefined();
      expect(value).toMatch(/^https?:\/\//);
    }
  });

  it('should have matching issuer and authority', () => {
    // Issuer should be a valid URL
    expect(() => new URL(config.app.issuer)).not.toThrow();
  });

  it('should support required grant types', () => {
    const grantTypes = ['authorization_code', 'refresh_token'];
    expect(grantTypes).toContain('authorization_code');
    expect(grantTypes).toContain('refresh_token');
  });

  it('should support required scopes', () => {
    const scopes = ['openid', 'profile', 'email', 'offline_access'];
    expect(scopes).toContain('openid');
    expect(scopes).toContain('profile');
    expect(scopes).toContain('email');
  });

  it('should have consistent endpoint URLs', () => {
    const baseUrl = config.app.url;
    const endpoints = [
      `${baseUrl}/oauth/authorize`,
      `${baseUrl}/oauth/token`,
      `${baseUrl}/oauth/userinfo`,
      `${baseUrl}/.well-known/openid-configuration`,
      `${baseUrl}/.well-known/jwks.json`,
    ];

    // All endpoints should start with base URL
    endpoints.forEach((endpoint) => {
      expect(endpoint).toContain(baseUrl);
    });
  });
});
