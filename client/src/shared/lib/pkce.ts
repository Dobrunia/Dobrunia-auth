/**
 * PKCE (Proof Key for Code Exchange) utilities
 * 
 * Implements RFC 7636 PKCE for OAuth 2.0 Authorization Code Flow
 */

/**
 * Generate a cryptographically secure random code verifier
 * @returns Base64URL encoded code verifier (43-128 characters)
 */
export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

/**
 * Generate code challenge from code verifier using SHA-256
 * @param codeVerifier The code verifier
 * @returns Base64URL encoded code challenge
 */
export async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(hash));
}

/**
 * Generate PKCE pair (verifier and challenge)
 * @returns Object with code_verifier and code_challenge
 */
export async function generatePKCE(): Promise<{
  code_verifier: string;
  code_challenge: string;
  code_challenge_method: 'S256';
}> {
  const code_verifier = generateCodeVerifier();
  const code_challenge = await generateCodeChallenge(code_verifier);
  
  return {
    code_verifier,
    code_challenge,
    code_challenge_method: 'S256' as const,
  };
}

/**
 * Base64URL encode an ArrayBuffer or Uint8Array
 */
function base64UrlEncode(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  
  // Standard base64
  const base64 = btoa(binary);
  
  // Convert to base64url (RFC 4648)
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Validate code verifier format (RFC 7636)
 * @param verifier The code verifier to validate
 * @returns true if valid
 */
export function isValidCodeVerifier(verifier: string): boolean {
  // Must be 43-128 characters
  if (verifier.length < 43 || verifier.length > 128) {
    return false;
  }
  
  // Must only contain [A-Z][a-z][0-9]-._~
  const validChars = /^[A-Za-z0-9\-._~]+$/;
  return validChars.test(verifier);
}

/**
 * Validate code challenge format
 * @param challenge The code challenge to validate
 * @returns true if valid
 */
export function isValidCodeChallenge(challenge: string): boolean {
  // Must be 43-128 characters
  if (challenge.length < 43 || challenge.length > 128) {
    return false;
  }
  
  // Must only contain [A-Z][a-z][0-9]-._~
  const validChars = /^[A-Za-z0-9\-._~]+$/;
  return validChars.test(challenge);
}
