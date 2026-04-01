-- Полная схема сущностей. Только CREATE TABLE IF NOT EXISTS — без DROP/TRUNCATE/DELETE.
-- Runner записывает имя файла в _migrations и не запускает его повторно при перезапуске сервера.

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) NOT NULL,
  email VARCHAR(255) NOT NULL,
  username VARCHAR(255) NULL,
  password_hash VARCHAR(255) NULL,
  email_verified TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  first_name VARCHAR(255) NULL,
  last_name VARCHAR(255) NULL,
  avatar_url VARCHAR(2048) NULL,
  last_login_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
  updated_at DATETIME(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_email (email),
  UNIQUE KEY uk_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS clients (
  id CHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT NULL,
  base_url VARCHAR(2048) NULL,
  logo_url VARCHAR(2048) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  oauth_redirect_uris JSON NULL
    COMMENT 'JSON array of allowed exact redirect_uri values for GET /oauth/authorize',
  created_at DATETIME(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
  updated_at DATETIME(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_clients_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessions (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  client_id CHAR(36) NOT NULL,
  status VARCHAR(32) NOT NULL,
  device_name VARCHAR(255) NULL,
  device_type VARCHAR(32) NULL,
  browser VARCHAR(128) NULL,
  os VARCHAR(128) NULL,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  country VARCHAR(128) NULL,
  city VARCHAR(128) NULL,
  last_seen_at DATETIME(3) NULL,
  expires_at DATETIME(3) NULL,
  revoked_at DATETIME(3) NULL,
  revoke_reason VARCHAR(512) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
  updated_at DATETIME(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_sessions_user_id (user_id),
  KEY idx_sessions_client_id (client_id),
  KEY idx_sessions_expires_at (expires_at),
  CONSTRAINT fk_sessions_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_sessions_client_id FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id CHAR(36) NOT NULL,
  session_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  family_id CHAR(36) NULL,
  previous_token_id CHAR(36) NULL,
  issued_at DATETIME(3) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  revoked_at DATETIME(3) NULL,
  revoke_reason VARCHAR(512) NULL,
  replaced_by_token_id CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
  PRIMARY KEY (id),
  UNIQUE KEY uk_refresh_tokens_token_hash (token_hash),
  KEY idx_refresh_tokens_session_id (session_id),
  KEY idx_refresh_tokens_user_id (user_id),
  KEY idx_refresh_tokens_family_id (family_id),
  KEY idx_refresh_tokens_expires_at (expires_at),
  CONSTRAINT fk_refresh_tokens_session_id FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE,
  CONSTRAINT fk_refresh_tokens_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_refresh_tokens_previous_token_id FOREIGN KEY (previous_token_id) REFERENCES refresh_tokens (id) ON DELETE SET NULL,
  CONSTRAINT fk_refresh_tokens_replaced_by_token_id FOREIGN KEY (replaced_by_token_id) REFERENCES refresh_tokens (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
