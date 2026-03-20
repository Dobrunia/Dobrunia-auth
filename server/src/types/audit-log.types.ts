/**
 * Audit log entity types
 */

export type AuditEventType =
  | 'USER_REGISTERED'
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'USER_LOGOUT_ALL'
  | 'PASSWORD_RESET_REQUESTED'
  | 'PASSWORD_RESET_COMPLETED'
  | 'EMAIL_VERIFICATION_SENT'
  | 'EMAIL_VERIFIED'
  | 'OAUTH_TOKEN_ISSUED'
  | 'OAUTH_TOKEN_REVOKED'
  | 'OAUTH_AUTHORIZATION_CODE_ISSUED'
  | 'SESSION_REVOKED'
  | 'SESSION_REVOKED_ALL';

export type AuditEventCategory =
  | 'authentication'
  | 'authorization'
  | 'oauth'
  | 'session'
  | 'user_management';

export type AuditStatus = 'success' | 'failure';

export interface AuditLog {
  id: number;
  event_type: AuditEventType;
  event_category: AuditEventCategory;
  user_id: number | null;
  client_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  status: AuditStatus;
  details: Record<string, any> | null;
  created_at: Date;
}

export interface AuditLogCreateInput {
  event_type: AuditEventType;
  event_category: AuditEventCategory;
  user_id?: number | null;
  client_id?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  status: AuditStatus;
  details?: Record<string, any> | null;
}
