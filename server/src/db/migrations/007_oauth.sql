-- OAuth2-style authorization: allowed redirect URIs per client
ALTER TABLE clients
  ADD COLUMN oauth_redirect_uris JSON NULL
  COMMENT 'JSON array of allowed exact redirect_uri values for GET /oauth/authorize';

-- One-time authorization codes (exchanged at POST /oauth/token)
CREATE TABLE IF NOT EXISTS oauth_authorization_codes (
  id CHAR(36) NOT NULL,
  code_hash CHAR(64) NOT NULL,
  client_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  session_id CHAR(36) NOT NULL,
  redirect_uri VARCHAR(2048) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  used_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
  PRIMARY KEY (id),
  UNIQUE KEY uk_oauth_codes_code_hash (code_hash),
  KEY idx_oauth_codes_client_expires (client_id, expires_at),
  CONSTRAINT fk_oauth_codes_client_id FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE,
  CONSTRAINT fk_oauth_codes_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_oauth_codes_session_id FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
