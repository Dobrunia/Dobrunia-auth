-- Migration 008: Create signing_keys table

CREATE TABLE IF NOT EXISTS signing_keys (
  id INT AUTO_INCREMENT PRIMARY KEY,
  key_id VARCHAR(64) NOT NULL UNIQUE,
  key_secret VARCHAR(512) NOT NULL,
  algorithm VARCHAR(16) NOT NULL DEFAULT 'HS256',
  status ENUM('active', 'previous', 'expired') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  expired_at TIMESTAMP NULL,
  INDEX idx_signing_keys_key_id (key_id),
  INDEX idx_signing_keys_status (status),
  INDEX idx_signing_keys_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
