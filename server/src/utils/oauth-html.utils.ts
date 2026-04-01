/** Экранирование текста для вставки в HTML. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function oauthErrorPage(title: string, message: string): string {
  const t = escapeHtml(title);
  const m = escapeHtml(message);
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${t}</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 2rem; max-width: 36rem; line-height: 1.5; }
    h1 { font-size: 1.25rem; }
  </style>
</head>
<body>
  <h1>${t}</h1>
  <p>${m}</p>
</body>
</html>`;
}

export function oauthLoginFormPage(params: {
  clientName: string;
  errorMessage?: string;
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const name = escapeHtml(params.clientName);
  const err = params.errorMessage
    ? `<p style="color:#b00020">${escapeHtml(params.errorMessage)}</p>`
    : '';
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Вход — ${name}</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 2rem; max-width: 22rem; }
    label { display: block; margin-top: 0.75rem; font-size: 0.875rem; }
    input[type="email"], input[type="password"] { width: 100%; box-sizing: border-box; padding: 0.5rem; margin-top: 0.25rem; }
    button { margin-top: 1rem; padding: 0.5rem 1rem; cursor: pointer; }
    .hint { font-size: 0.8rem; color: #555; margin-top: 1rem; }
  </style>
</head>
<body>
  <h1 style="font-size:1.1rem">Вход в ${name}</h1>
  ${err}
  <form method="post" action="/oauth/authorize">
    <input type="hidden" name="client_id" value="${escapeHtml(params.clientId)}"/>
    <input type="hidden" name="redirect_uri" value="${escapeHtml(params.redirectUri)}"/>
    <input type="hidden" name="response_type" value="code"/>
    <input type="hidden" name="state" value="${escapeHtml(params.state)}"/>
    <label>Email<input type="email" name="email" required autocomplete="username"/></label>
    <label>Пароль<input type="password" name="password" required autocomplete="current-password"/></label>
    <button type="submit">Продолжить</button>
  </form>
  <p class="hint">После входа вы будете перенаправлены в приложение.</p>
</body>
</html>`;
}
