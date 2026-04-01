-- Локальные OAuth-клиенты для dev: вставка только если нет строки с таким slug (не UPDATE существующих).

INSERT INTO clients (id, name, slug, is_active, oauth_redirect_uris, created_at, updated_at)
SELECT
  '11111111-1111-4111-8111-111111111111',
  'Dobrunia Auth Web',
  'dobrunia-auth-web',
  1,
  JSON_ARRAY('http://localhost:5173/oauth/callback'),
  CURRENT_TIMESTAMP(3),
  CURRENT_TIMESTAMP(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM clients WHERE slug = 'dobrunia-auth-web' LIMIT 1);

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
