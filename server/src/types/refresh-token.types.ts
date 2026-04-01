import type { SessionId } from './session.types';
import type { UserId } from './user.types';

export type RefreshTokenId = string;

/** Узкая строка для logout: активный refresh по hash. */
export interface ActiveRefreshTokenLookupRow {
  id: RefreshTokenId;
  session_id: SessionId;
}

/** Данные активного refresh для ротации (POST /auth/refresh). */
export interface ActiveRefreshTokenRotationRow {
  id: RefreshTokenId;
  session_id: SessionId;
  user_id: UserId;
  family_id: string | null;
  email: string;
}

export interface RefreshToken {
  id: RefreshTokenId;
  session_id: SessionId;
  user_id: UserId;
  /** Hash of the opaque refresh token (e.g. SHA-256); never store the raw token */
  token_hash: string;
  family_id: string | null;
  previous_token_id: RefreshTokenId | null;
  issued_at: Date;
  expires_at: Date;
  revoked_at: Date | null;
  revoke_reason: string | null;
  replaced_by_token_id: RefreshTokenId | null;
  created_at: Date;
}
