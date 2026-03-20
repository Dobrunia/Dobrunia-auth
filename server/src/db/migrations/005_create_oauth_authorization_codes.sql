-- Migration 005: Create oauth_authorization_codes table

CREATE TABLE IF NOT EXISTS oauth_authorization_codes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code_hash VARCHAR(255) NOT NULL,
  user_id INT NOT NULL,
  client_id INT NOT NULL,
  redirect_uri VARCHAR(512) NOT NULL,
  scope VARCHAR(1024) NULL,
  code_challenge VARCHAR(128) NULL,
  code_challenge_method VARCHAR(16) NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_auth_codes_code_hash (code_hash),
  INDEX idx_auth_codes_user_id (user_id),
  INDEX idx_auth_codes_client_id (client_id),
  INDEX idx_auth_codes_expires (expires_at),
  CONSTRAINT fk_auth_codes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_auth_codes_client FOREIGN KEY (client_id) REFERENCES oauth_clients(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
