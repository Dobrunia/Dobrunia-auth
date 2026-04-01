/**
 * Разбор заголовка Cookie в плоский объект (первое значение на имя).
 */
export function parseCookieHeader(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header || typeof header !== 'string') {
    return out;
  }
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) {
      continue;
    }
    const name = part.slice(0, idx).trim();
    const raw = part.slice(idx + 1).trim();
    if (!name) {
      continue;
    }
    try {
      out[name] = decodeURIComponent(raw);
    } catch {
      out[name] = raw;
    }
  }
  return out;
}

export interface SerializeCookieOptions {
  maxAgeSec: number;
  path: string;
  httpOnly: boolean;
  sameSite: 'Lax' | 'Strict' | 'None';
  secure: boolean;
}

export function serializeSetCookie(
  name: string,
  value: string,
  opts: SerializeCookieOptions
): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${opts.path}`,
    `Max-Age=${opts.maxAgeSec}`,
    `SameSite=${opts.sameSite}`,
  ];
  if (opts.httpOnly) {
    parts.push('HttpOnly');
  }
  if (opts.secure) {
    parts.push('Secure');
  }
  return parts.join('; ');
}
