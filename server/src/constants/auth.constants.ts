/**
 * Auth-related constants
 */

export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  BANNED: 'banned',
} as const;

export const DEFAULT_USER_STATUS = USER_STATUS.ACTIVE;

export const TOKEN_TTL = {
  ACCESS_TOKEN: '15m',
  REFRESH_TOKEN: '30d',
  EMAIL_VERIFICATION: '24h',
  PASSWORD_RESET: '1h',
} as const;

export const PASSWORD_POLICY = {
  MIN_LENGTH: 8,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBER: true,
  REQUIRE_SPECIAL: false,
} as const;
