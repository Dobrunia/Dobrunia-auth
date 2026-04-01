export const SESSION_STATUS = {
  ACTIVE: 'active',
  REVOKED: 'revoked',
  EXPIRED: 'expired',
} as const;

export const REVOKE_REASON = {
  LOGOUT: 'logout',
} as const;
