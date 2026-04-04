/**
 * До импорта приложения: пустой AUTH_WEB_PUBLIC_URL, чтобы локальный .env
 * не ломал сценарии OAuth (редирект на oauth-bridge vs HTML-форма).
 */
process.env.AUTH_WEB_PUBLIC_URL = '';
