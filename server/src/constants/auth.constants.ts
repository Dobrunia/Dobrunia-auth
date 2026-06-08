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
  /** Сессия завершена владельцем приложения-клиента. */
  CLIENT_OWNER_REVOKED: 'client_owner_revoked',
} as const;
