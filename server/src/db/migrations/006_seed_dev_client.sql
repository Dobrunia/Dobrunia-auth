-- Optional dev client for local register flow (slug shop-web)
INSERT INTO clients (id, name, slug, is_active, created_at, updated_at)
SELECT '11111111-1111-4111-8111-111111111111', 'Shop Web', 'shop-web', 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM clients WHERE slug = 'shop-web' LIMIT 1);
