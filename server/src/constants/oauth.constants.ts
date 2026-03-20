/**
 * OAuth-related constants
 */

export const GRANT_TYPES = {
  AUTHORIZATION_CODE: 'authorization_code',
  REFRESH_TOKEN: 'refresh_token',
} as const;

export const DEFAULT_GRANT_TYPES = [
  GRANT_TYPES.AUTHORIZATION_CODE,
  GRANT_TYPES.REFRESH_TOKEN,
] as const;

export const SCOPES = {
  OPENID: 'openid',
  PROFILE: 'profile',
  EMAIL: 'email',
  OFFLINE_ACCESS: 'offline_access',
} as const;

export const DEFAULT_SCOPES = [
  SCOPES.OPENID,
  SCOPES.PROFILE,
  SCOPES.EMAIL,
] as const;
