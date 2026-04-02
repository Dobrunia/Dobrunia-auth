/**
 * Сборка списка разрешённых Origin для CORS + валидация «отражаемого» Origin (произвольные клиентские SPA).
 */

export function originFromPublicUrl(publicUrl: string): string | null {
  const t = publicUrl.trim();
  if (!t) {
    return null;
  }
  try {
    return new URL(t.includes('://') ? t : `https://${t}`).origin;
  } catch {
    return null;
  }
}

/** Парсинг CSV + автоматическое добавление origin из AUTH_WEB_PUBLIC_URL (без дубликатов). */
export function mergeCorsOriginsCsv(csv: string, authWebPublicUrl: string): string[] {
  const fromEnv = csv
    .trim()
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const authOrigin = originFromPublicUrl(authWebPublicUrl);
  if (!authOrigin) {
    return fromEnv;
  }
  const set = new Set(fromEnv);
  set.add(authOrigin);
  return Array.from(set);
}

/**
 * Origin из браузера (http/https), пригодный для Access-Control-Allow-Origin.
 * В production при httpsOnly — только https: (кроме localhost для dev-стиля URL).
 */
export function isReflectableOrigin(origin: string, httpsOnly: boolean): boolean {
  let u: URL;
  try {
    u = new URL(origin);
  } catch {
    return false;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    return false;
  }
  if (!u.hostname) {
    return false;
  }
  if (httpsOnly) {
    if (u.protocol === 'https:') {
      return true;
    }
    return u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  }
  return true;
}
