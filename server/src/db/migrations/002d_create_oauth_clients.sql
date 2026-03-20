-- Migration 002d: Create oauth_clients table

CREATE TABLE IF NOT EXISTS oauth_clients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id VARCHAR(64) NOT NULL UNIQUE,
  client_secret_hash VARCHAR(255) NULL,
  name VARCHAR(255) NOT NULL,
  redirect_uris JSON NOT NULL,
  allowed_scopes JSON NOT NULL,
  grant_types JSON NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_oauth_clients_client_id (client_id),
  INDEX idx_oauth_clients_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
