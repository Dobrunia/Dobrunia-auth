-- Пользовательские OAuth-клиенты принадлежат зарегистрировавшему их пользователю.
-- Системные seed-клиенты остаются с owner_user_id = NULL.

ALTER TABLE clients
  ADD COLUMN owner_user_id CHAR(36) NULL AFTER id,
  ADD KEY idx_clients_owner_user_id (owner_user_id),
  ADD CONSTRAINT fk_clients_owner_user_id
    FOREIGN KEY (owner_user_id) REFERENCES users (id) ON DELETE CASCADE;
