/**
 * Application constants
 * All non-environment shared constants must be placed here
 */

export const APP_NAME = 'Dobrunia Auth';

export const DEFAULT_PORT = 3000;

export const HEALTH_STATUS = {
  OK: 'ok',
  ERROR: 'error',
} as const;

export const ROUTES = {
  HEALTH: '/health',
} as const;

export const DB_TABLES = {
  USERS: 'users',
  SESSIONS: 'sessions',
  REFRESH_TOKENS: 'refresh_tokens',
  OAUTH_CLIENTS: 'oauth_clients',
  OAUTH_AUTHORIZATION_CODES: 'oauth_authorization_codes',
  EMAIL_VERIFICATION_TOKENS: 'email_verification_tokens',
  PASSWORD_RESET_TOKENS: 'password_reset_tokens',
  AUDIT_LOGS: 'audit_logs',
} as const;
