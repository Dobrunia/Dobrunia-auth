-- Старые БД: таблица уже есть без колонок из актуальной 002/003 (IF NOT EXISTS не меняет схему).
-- Идемпотентно добавляем то, без чего падают register/login и резолв клиента.

SET @db := DATABASE();

-- users.email_verified
SET @exist := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'users' AND COLUMN_NAME = 'email_verified'
);
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE users ADD COLUMN email_verified TINYINT(1) NOT NULL DEFAULT 0',
  'SELECT 1'
);
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- users.is_active
SET @exist := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'users' AND COLUMN_NAME = 'is_active'
);
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE users ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1',
  'SELECT 1'
);
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- clients.is_active
SET @exist := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'clients' AND COLUMN_NAME = 'is_active'
);
SET @sqlstmt := IF(@exist = 0,
  'ALTER TABLE clients ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1',
  'SELECT 1'
);
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
