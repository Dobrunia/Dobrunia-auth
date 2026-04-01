export const SESSION_STATUS = {
  ACTIVE: 'active',
  REVOKED: 'revoked',
  EXPIRED: 'expired',
} as const;

export const REVOKE_REASON = {
  LOGOUT: 'logout',
  ROTATED: 'rotated',
  /** Сессия завершена пользователем с дашборда (DELETE /sessions/:id) */
  SESSION_REVOKED: 'session_revoked',
} as const;
