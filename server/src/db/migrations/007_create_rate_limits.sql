-- Migration 007: Create rate_limits table

CREATE TABLE IF NOT EXISTS rate_limits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  rate_key VARCHAR(128) NOT NULL,
  window_start TIMESTAMP NOT NULL,
  request_count INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_key_window (rate_key, window_start),
  INDEX idx_rate_limits_key (rate_key),
  INDEX idx_rate_limits_window (window_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
