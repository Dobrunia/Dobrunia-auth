-- Migration 006: Create audit_logs table

CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_type VARCHAR(64) NOT NULL,
  event_category VARCHAR(32) NOT NULL,
  user_id INT NULL,
  client_id VARCHAR(64) NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(512) NULL,
  status ENUM('success', 'failure') NOT NULL,
  details JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_logs_event_type (event_type),
  INDEX idx_audit_logs_user_id (user_id),
  INDEX idx_audit_logs_created_at (created_at),
  INDEX idx_audit_logs_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
