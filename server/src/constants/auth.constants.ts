export const SESSION_STATUS = {
  ACTIVE: 'active',
  REVOKED: 'revoked',
  EXPIRED: 'expired',
} as const;

export const REVOKE_REASON = {
  LOGOUT: 'logout',
  ROTATED: 'rotated',
} as const;
