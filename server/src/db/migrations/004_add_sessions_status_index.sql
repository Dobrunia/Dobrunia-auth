-- Ускоряет выборку активных сессий и периодическое удаление завершенных.

ALTER TABLE sessions
  ADD KEY idx_sessions_status (status);
