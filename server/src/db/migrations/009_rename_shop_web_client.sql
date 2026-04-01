-- Уже применённым инсталляциям: старый slug shop-web → dobrunia-auth-web
UPDATE clients
SET
  slug = 'dobrunia-auth-web',
  name = 'Dobrunia Auth Web',
  updated_at = CURRENT_TIMESTAMP(3)
WHERE id = '11111111-1111-4111-8111-111111111111'
  AND slug = 'shop-web';

-- Если oauth redirect ещё не задан (старый порядок миграций / пропуск 008)
UPDATE clients
SET oauth_redirect_uris = JSON_ARRAY('http://localhost:5173/oauth/callback')
WHERE id = '11111111-1111-4111-8111-111111111111'
  AND (oauth_redirect_uris IS NULL OR JSON_LENGTH(oauth_redirect_uris) = 0);
