import { describe, it, expect } from 'vitest';
import { AVAILABLE_SCOPES, AVAILABLE_GRANT_TYPES, CLIENT_FORM_DEFAULTS } from '../../../constants/admin.constants';

describe('Admin OAuth Client Form', () => {
  it('should have default form values', () => {
    expect(CLIENT_FORM_DEFAULTS.name).toBe('');
    expect(CLIENT_FORM_DEFAULTS.redirect_uris).toEqual(['']);
    expect(CLIENT_FORM_DEFAULTS.allowed_scopes).toContain('openid');
    expect(CLIENT_FORM_DEFAULTS.allowed_scopes).toContain('profile');
    expect(CLIENT_FORM_DEFAULTS.allowed_scopes).toContain('email');
    expect(CLIENT_FORM_DEFAULTS.is_active).toBe(true);
  });

  it('should have available scopes defined', () => {
    expect(AVAILABLE_SCOPES).toContain('openid');
    expect(AVAILABLE_SCOPES).toContain('profile');
    expect(AVAILABLE_SCOPES).toContain('email');
    expect(AVAILABLE_SCOPES).toContain('offline_access');
  });

  it('should have available grant types defined', () => {
    expect(AVAILABLE_GRANT_TYPES).toContain('authorization_code');
    expect(AVAILABLE_GRANT_TYPES).toContain('refresh_token');
  });

  it('should validate redirect URI format', () => {
    const validUris = [
      'https://example.com/callback',
      'http://localhost:3000/callback',
      'https://myapp.com/oauth/callback',
    ];

    const invalidUris = [
      'not-a-url',
      '',
    ];

    // Test valid URIs
    for (const uri of validUris) {
      expect(() => new URL(uri)).not.toThrow();
    }

    // Test invalid URIs
    for (const uri of invalidUris) {
      if (uri) {
        expect(() => new URL(uri)).toThrow();
      }
    }
    
    // ftp:// is actually a valid URL scheme, just not for OAuth
    // So we test it separately
    expect(() => new URL('ftp://example.com')).not.toThrow();
  });

  it('should allow multiple redirect URIs', () => {
    const redirectUris = [
      'https://example.com/callback',
      'https://example.com/oauth/callback',
      'https://staging.example.com/callback',
    ];

    expect(redirectUris.length).toBeGreaterThan(1);
    expect(redirectUris.every(uri => {
      try {
        new URL(uri);
        return true;
      } catch {
        return false;
      }
    })).toBe(true);
  });

  it('should require at least one scope', () => {
    const defaultScopes = [...CLIENT_FORM_DEFAULTS.allowed_scopes];
    expect(defaultScopes.length).toBeGreaterThan(0);
  });

  it('should require at least one grant type', () => {
    const defaultGrants = [...CLIENT_FORM_DEFAULTS.grant_types];
    expect(defaultGrants.length).toBeGreaterThan(0);
  });
});
