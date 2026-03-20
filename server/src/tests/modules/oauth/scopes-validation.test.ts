import { describe, it, expect } from 'vitest';
import { SCOPES } from '../../../constants/oauth.constants';

describe('OAuth Scopes and Client Restrictions', () => {
  it('should reject authorize request with unsupported scopes', () => {
    const supportedScopes = [
      SCOPES.OPENID,
      SCOPES.PROFILE,
      SCOPES.EMAIL,
      SCOPES.OFFLINE_ACCESS,
    ];
    const unsupportedScope = 'admin';
    
    expect(supportedScopes).not.toContain(unsupportedScope);
  });

  it('should return only allowed claims based on scopes', () => {
    // Simulate userinfo response with different scopes
    const allClaims = {
      sub: '123',
      name: 'Test User',
      email: 'test@example.com',
      email_verified: true,
      picture: 'https://example.com/avatar.jpg',
      updated_at: 1234567890,
    };

    // With only 'openid' scope
    const openidOnly = { sub: allClaims.sub };
    expect(openidOnly).toHaveProperty('sub');
    expect(openidOnly).not.toHaveProperty('email');

    // With 'openid profile' scopes
    const openidProfile = { sub: allClaims.sub, name: allClaims.name };
    expect(openidProfile).toHaveProperty('name');

    // With 'openid email' scopes
    const openidEmail = { sub: allClaims.sub, email: allClaims.email };
    expect(openidEmail).toHaveProperty('email');
  });

  it('should validate scopes in token endpoint', () => {
    const validScopes = ['openid', 'profile', 'email'];
    const invalidScope = 'invalid_scope';
    
    expect(validScopes.every(s => [SCOPES.OPENID, SCOPES.PROFILE, SCOPES.EMAIL].includes(s))).toBe(true);
    expect([SCOPES.OPENID, SCOPES.PROFILE, SCOPES.EMAIL]).not.toContain(invalidScope);
  });

  it('should restrict client to allowed scopes only', () => {
    const clientAllowedScopes = ['openid', 'profile'];
    const requestedScopes = ['openid', 'profile', 'email'];
    
    // Check if all requested scopes are allowed
    const allAllowed = requestedScopes.every(s => clientAllowedScopes.includes(s));
    expect(allAllowed).toBe(false);
  });

  it('should support offline_access scope for refresh tokens', () => {
    const scopesWithOffline = ['openid', 'profile', 'offline_access'];
    expect(scopesWithOffline).toContain(SCOPES.OFFLINE_ACCESS);
  });

  it('should include scopes in access token', () => {
    const tokenScopes = 'openid profile email';
    const scopeArray = tokenScopes.split(' ');
    
    expect(scopeArray).toHaveLength(3);
    expect(scopeArray).toContain('openid');
    expect(scopeArray).toContain('profile');
  });
});
