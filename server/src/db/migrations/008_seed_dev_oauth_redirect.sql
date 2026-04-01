-- Dev: default OAuth callback for seeded auth-web client (safe no-op if row missing)
UPDATE clients
SET oauth_redirect_uris = JSON_ARRAY('http://localhost:5173/oauth/callback')
WHERE id = '11111111-1111-4111-8111-111111111111'
  AND slug = 'dobrunia-auth-web'
  AND (oauth_redirect_uris IS NULL OR JSON_LENGTH(oauth_redirect_uris) = 0);
