/**
 * Admin-related constants
 */

export const ADMIN_ROUTES = {
  DASHBOARD: '/admin',
  CLIENTS: '/admin/clients',
  CLIENT_CREATE: '/admin/clients/new',
  CLIENT_EDIT: '/admin/clients/:id',
  AUDIT_LOGS: '/admin/audit-logs',
} as const;

export const CLIENT_FORM_DEFAULTS = {
  name: '',
  redirect_uris: [''],
  allowed_scopes: ['openid', 'profile', 'email'],
  grant_types: ['authorization_code', 'refresh_token'],
  is_active: true,
} as const;

export const AVAILABLE_SCOPES = [
  'openid',
  'profile',
  'email',
  'offline_access',
] as const;

export const AVAILABLE_GRANT_TYPES = [
  'authorization_code',
  'refresh_token',
] as const;
