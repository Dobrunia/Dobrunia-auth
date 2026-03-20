-- Migration 009: Add service tracking to sessions

-- Add columns
ALTER TABLE sessions 
ADD COLUMN client_id INT NULL AFTER user_id,
ADD COLUMN service_name VARCHAR(255) NULL AFTER client_id,
ADD INDEX idx_sessions_user_client (user_id, client_id);

-- Note: Foreign key constraint omitted for migration compatibility
-- The relationship is enforced at application level
