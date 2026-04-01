-- Отдельный OAuth-клиент для локального example-приложения (порт Vite 5174)
INSERT INTO clients (id, name, slug, is_active, oauth_redirect_uris, created_at, updated_at)
SELECT
  '22222222-2222-4222-8222-222222222222',
  'Dobrunia Auth Example',
  'dobrunia-auth-example',
  1,
  JSON_ARRAY('http://localhost:5174/oauth/callback'),
  CURRENT_TIMESTAMP(3),
  CURRENT_TIMESTAMP(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM clients WHERE slug = 'dobrunia-auth-example' LIMIT 1);
