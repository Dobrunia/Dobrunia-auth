import { describe, it, expect } from 'vitest';
import { 
  generateCodeVerifier, 
  generateCodeChallenge, 
  generatePKCE,
  isValidCodeVerifier,
  isValidCodeChallenge 
} from '../../../shared/lib/pkce';

describe('PKCE Utilities', () => {
  it('should generate valid code verifier', () => {
    const verifier = generateCodeVerifier();
    
    expect(verifier).toBeDefined();
    expect(verifier.length).toBeGreaterThanOrEqual(43);
    expect(verifier.length).toBeLessThanOrEqual(128);
    expect(isValidCodeVerifier(verifier)).toBe(true);
  });

  it('should generate valid code challenge from verifier', async () => {
    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    
    expect(challenge).toBeDefined();
    expect(challenge.length).toBe(43); // SHA-256 produces 43 base64url chars
    expect(isValidCodeChallenge(challenge)).toBe(true);
  });

  it('should generate valid PKCE pair', async () => {
    const pkce = await generatePKCE();
    
    expect(pkce.code_verifier).toBeDefined();
    expect(pkce.code_challenge).toBeDefined();
    expect(pkce.code_challenge_method).toBe('S256');
    
    // Verify the challenge matches the verifier
    const expectedChallenge = await generateCodeChallenge(pkce.code_verifier);
    expect(pkce.code_challenge).toBe(expectedChallenge);
  });

  it('should validate code_verifier format', () => {
    // Valid verifiers
    expect(isValidCodeVerifier(generateCodeVerifier())).toBe(true);
    expect(isValidCodeVerifier('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~')).toBe(true);
    
    // Invalid: too short
    expect(isValidCodeVerifier('short')).toBe(false);
    
    // Invalid: wrong characters
    expect(isValidCodeVerifier('invalid!@#')).toBe(false);
    expect(isValidCodeVerifier('invalid+')).toBe(false);
  });

  it('should validate code_challenge format', () => {
    // Valid challenges
    expect(isValidCodeChallenge('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')).toBe(true);
    
    // Invalid: too short
    expect(isValidCodeChallenge('short')).toBe(false);
    
    // Invalid: wrong characters
    expect(isValidCodeChallenge('invalid!@#')).toBe(false);
  });

  it('should use S256 method for code challenge', async () => {
    const verifier = 'test_verifier_123456789012345678901234567890';
    const challenge = await generateCodeChallenge(verifier);
    
    // S256 produces different result than plain
    expect(challenge).not.toBe(verifier);
    
    // Verify it's a proper SHA-256 hash
    const expectedHash = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(verifier)
    );
    const expectedBase64Url = btoa(String.fromCharCode(...new Uint8Array(expectedHash)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    expect(challenge).toBe(expectedBase64Url);
  });

  it('should generate different verifiers each time', () => {
    const verifier1 = generateCodeVerifier();
    const verifier2 = generateCodeVerifier();
    
    expect(verifier1).not.toBe(verifier2);
  });
});
