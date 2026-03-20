/**
 * Signing key entity types
 */

export type SigningKeyStatus = 'active' | 'previous' | 'expired';
export type SigningAlgorithm = 'HS256' | 'HS384' | 'HS512' | 'RS256';

export interface SigningKey {
  id: number;
  key_id: string;
  key_secret: string;
  algorithm: SigningAlgorithm;
  status: SigningKeyStatus;
  created_at: Date;
  expires_at: Date | null;
  expired_at: Date | null;
}

export interface SigningKeyCreateInput {
  key_id: string;
  key_secret: string;
  algorithm?: SigningAlgorithm;
  expires_at?: Date | null;
}

export interface KeyRotationResult {
  newKeyId: string;
  previousKeyId: string | null;
  rotatedAt: Date;
}
