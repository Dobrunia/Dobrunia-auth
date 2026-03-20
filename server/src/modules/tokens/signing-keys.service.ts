import { signingKeysRepository } from './signing-keys.repository';
import type { SigningKey, KeyRotationResult } from '../../types/signing-key.types';
import * as crypto from 'crypto';

export const KEY_ROTATION_CONFIG = {
  // How often to rotate keys (in days)
  rotationIntervalDays: 30,
  
  // How long to keep previous keys for validation (in days)
  previousKeyRetentionDays: 7,
  
  // Key length in bytes
  keyLength: 32,
} as const;

export class SigningKeysService {
  /**
   * Generate a random signing key
   */
  generateKeySecret(): string {
    return crypto.randomBytes(KEY_ROTATION_CONFIG.keyLength).toString('hex');
  }

  /**
   * Generate a unique key ID
   */
  generateKeyId(): string {
    return `key_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  /**
   * Get the current active signing key
   * If no active key exists, create one
   */
  async getActiveKey(): Promise<SigningKey> {
    let activeKey = await signingKeysRepository.getActiveKey();

    if (!activeKey) {
      // No active key, create initial key
      await this.rotateKey();
      activeKey = await signingKeysRepository.getActiveKey();
    }

    if (!activeKey) {
      throw new Error('Failed to create initial signing key');
    }

    return activeKey;
  }

  /**
   * Get all keys that can be used for token validation
   */
  async getValidationKeys(): Promise<SigningKey[]> {
    return signingKeysRepository.getValidationKeys();
  }

  /**
   * Rotate signing key
   * - Mark current active key as 'previous'
   * - Create new active key
   */
  async rotateKey(): Promise<KeyRotationResult> {
    const now = new Date();
    
    // Calculate expiration date for new key
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + KEY_ROTATION_CONFIG.rotationIntervalDays);

    // Generate new key
    const newKeyId = this.generateKeyId();
    const newKeySecret = this.generateKeySecret();

    // Get current active key before rotation
    const currentActiveKey = await signingKeysRepository.getActiveKey();
    const previousKeyId = currentActiveKey?.key_id || null;

    // Mark all active keys as previous
    await signingKeysRepository.markAllActiveAsPrevious();

    // Create new active key
    await signingKeysRepository.create({
      key_id: newKeyId,
      key_secret: newKeySecret,
      algorithm: 'HS256',
      expires_at: expiresAt,
    });

    // Expire old previous keys
    await signingKeysRepository.expireOldKeys(KEY_ROTATION_CONFIG.previousKeyRetentionDays);

    return {
      newKeyId,
      previousKeyId,
      rotatedAt: now,
    };
  }

  /**
   * Clean up expired keys from database
   */
  async cleanup(): Promise<{ expired: number; deleted: number }> {
    // Mark old previous keys as expired
    const expired = await signingKeysRepository.expireOldKeys(
      KEY_ROTATION_CONFIG.previousKeyRetentionDays
    );

    // Delete expired keys
    const deleted = await signingKeysRepository.deleteExpiredKeys();

    return { expired, deleted };
  }

  /**
   * Get key by ID (for validation)
   */
  async getKeyById(keyId: string): Promise<SigningKey | null> {
    return signingKeysRepository.getById(keyId);
  }

  /**
   * Check if key rotation is needed
   */
  async isRotationNeeded(): Promise<boolean> {
    const activeKey = await signingKeysRepository.getActiveKey();

    if (!activeKey) {
      return true; // No active key
    }

    if (!activeKey.expires_at) {
      return false; // Key doesn't expire
    }

    // Check if key is close to expiration (within 7 days)
    const now = new Date();
    const threshold = new Date(now);
    threshold.setDate(threshold.getDate() + 7);

    return activeKey.expires_at <= threshold;
  }
}

export const signingKeysService = new SigningKeysService();
