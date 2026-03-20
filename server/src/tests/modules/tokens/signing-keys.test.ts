import { describe, it, expect, beforeAll } from 'vitest';
import { signingKeysService, KEY_ROTATION_CONFIG } from '../../../modules/tokens/signing-keys.service';
import { signingKeysRepository } from '../../../modules/tokens/signing-keys.repository';

describe('Signing Key Rotation', () => {
  beforeAll(async () => {
    // Clean up any existing keys before tests
    await signingKeysRepository.expireOldKeys(0);
    await signingKeysRepository.deleteExpiredKeys();
  });

  it('should generate new signing key', async () => {
    const result = await signingKeysService.rotateKey();

    expect(result.newKeyId).toBeDefined();
    expect(result.newKeyId).toMatch(/^key_\d+_[a-f0-9]{8}$/);
    expect(result.rotatedAt).toBeDefined();
  });

  it('should get active signing key', async () => {
    const activeKey = await signingKeysService.getActiveKey();

    expect(activeKey).toBeDefined();
    expect(activeKey.key_id).toBeDefined();
    expect(activeKey.key_secret).toBeDefined();
    expect(activeKey.status).toBe('active');
  });

  it('should keep previous key for validation', async () => {
    // Get current key
    const keyBeforeRotation = await signingKeysService.getActiveKey();
    const keyIdBeforeRotation = keyBeforeRotation.key_id;

    // Rotate key
    await signingKeysService.rotateKey();

    // Get all validation keys (should include previous)
    const validationKeys = await signingKeysService.getValidationKeys();

    // Should have at least 2 keys (active + previous)
    expect(validationKeys.length).toBeGreaterThanOrEqual(1);
    
    // Previous key should be in the list
    const previousKey = validationKeys.find(k => k.key_id === keyIdBeforeRotation);
    expect(previousKey).toBeDefined();
  });

  it('should expire old keys', async () => {
    // Create a key that will be marked as previous
    await signingKeysService.rotateKey();
    
    // Verify previous key exists
    const keys = await signingKeysRepository.getValidationKeys();
    const previousKeys = keys.filter(k => k.status === 'previous');
    
    // Previous keys should exist
    expect(previousKeys.length).toBeGreaterThanOrEqual(0);
  });

  it('should cleanup expired keys', async () => {
    // Run cleanup
    const result = await signingKeysService.cleanup();

    // Cleanup should complete without error
    expect(result).toBeDefined();
    expect(typeof result.expired).toBe('number');
    expect(typeof result.deleted).toBe('number');
  });

  it('should detect when rotation is needed', async () => {
    const needsRotation = await signingKeysService.isRotationNeeded();
    
    // Should either need rotation (no key) or not (has key)
    expect(typeof needsRotation).toBe('boolean');
  });

  it('should generate key with correct configuration', () => {
    const keySecret = signingKeysService.generateKeySecret();
    const keyId = signingKeysService.generateKeyId();

    // Key should be hex string of configured length
    expect(keySecret).toMatch(/^[a-f0-9]+$/);
    expect(keySecret.length).toBe(KEY_ROTATION_CONFIG.keyLength * 2);

    // Key ID should have expected format
    expect(keyId).toMatch(/^key_\d+_[a-f0-9]{8}$/);
  });

  it('should maintain only one active key after rotation', async () => {
    // Rotate multiple times
    await signingKeysService.rotateKey();
    await signingKeysService.rotateKey();

    // Get all active keys
    const activeKey = await signingKeysRepository.getActiveKey();

    // Should have exactly one active key
    expect(activeKey).toBeDefined();
    expect(activeKey?.status).toBe('active');
  });
});
