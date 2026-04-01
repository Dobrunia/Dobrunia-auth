import { randomUUID } from 'crypto';
import type { PoolConnection } from 'mysql2/promise';
import type { Request } from 'express';
import { ZodError } from 'zod';
import { SESSION_STATUS } from '../../../constants/auth.constants';
import {
  OAUTH_AUTH_CODE_EXPIRES_SEC,
  OAUTH_BROWSER_COOKIE_MAX_AGE_SEC,
  OAUTH_BROWSER_COOKIE_NAME,
} from '../../../constants/oauth.constants';
import { getDatabasePool } from '../../../db/database';
import { HttpError } from '../../../middleware/error.middleware';
import { findActiveClientWithOAuthRedirects } from '../../clients/client.repository';
import { isSessionActiveForUserAndClient } from '../../sessions/session.repository';
import { generateOpaqueRefreshToken, hashRefreshToken } from '../../auth/token.utils';
import { loginService } from '../../auth/login/login.service';
import { oauthAuthorizeParamsSchema, oauthAuthorizePostBodySchema } from '../../../utils/schemas/oauth.schema';
import { oauthErrorPage, oauthLoginFormPage } from '../../../utils/oauth-html.utils';
import { parseCookieHeader, serializeSetCookie } from '../../../utils/cookie.utils';
import { getClientIp, getUserAgent } from '../../../utils/request.utils';
import { signOauthBrowserCookie, verifyOauthBrowserCookie } from '../oauth-browser.jwt';
import { insertOAuthAuthorizationCode } from '../oauth-code.repository';

function firstQueryString(v: unknown): string | undefined {
  if (typeof v === 'string') {
    return v;
  }
  if (Array.isArray(v) && typeof v[0] === 'string') {
    return v[0];
  }
  return undefined;
}

function zodMessage(e: ZodError): string {
  const first = e.errors[0];
  return first ? `${first.path.join('.')}: ${first.message}` : 'Invalid input';
}

function redirectAllowed(allowed: string[], uri: string): boolean {
  return allowed.includes(uri);
}

async function mintAuthorizationCodeRedirect(
  connection: PoolConnection,
  params: {
    clientId: string;
    userId: string;
    sessionId: string;
    redirectUri: string;
    state?: string;
  }
): Promise<string> {
  const plain = generateOpaqueRefreshToken();
  const codeHash = hashRefreshToken(plain);
  const id = randomUUID();
  const expiresAt = new Date(Date.now() + OAUTH_AUTH_CODE_EXPIRES_SEC * 1000);
  await insertOAuthAuthorizationCode(connection, {
    id,
    codeHash,
    clientId: params.clientId,
    userId: params.userId,
    sessionId: params.sessionId,
    redirectUri: params.redirectUri,
    expiresAt,
  });
  const target = new URL(params.redirectUri);
  target.searchParams.set('code', plain);
  if (params.state != null && params.state !== '') {
    target.searchParams.set('state', params.state);
  }
  return target.toString();
}

function buildAuthorizeQueryRedirect(params: {
  client_id: string;
  redirect_uri: string;
  state?: string;
}): string {
  const q = new URLSearchParams();
  q.set('client_id', params.client_id);
  q.set('redirect_uri', params.redirect_uri);
  q.set('response_type', 'code');
  if (params.state != null && params.state !== '') {
    q.set('state', params.state);
  }
  return `/oauth/authorize?${q.toString()}`;
}

function browserCookieHeader(value: string): string {
  const secure = process.env.NODE_ENV === 'production';
  return serializeSetCookie(OAUTH_BROWSER_COOKIE_NAME, value, {
    maxAgeSec: OAUTH_BROWSER_COOKIE_MAX_AGE_SEC,
    path: '/',
    httpOnly: true,
    sameSite: 'Lax',
    secure,
  });
}

export type AuthorizeGetResult =
  | { kind: 'redirect'; location: string }
  | { kind: 'html'; status: number; body: string };

export type AuthorizePostResult =
  | { kind: 'redirect'; location: string; setCookie: string }
  | { kind: 'html'; status: number; body: string };

export const oauthAuthorizeService = {
  async handleGet(req: Request): Promise<AuthorizeGetResult> {
    let params;
    try {
      params = oauthAuthorizeParamsSchema.parse({
        client_id: firstQueryString(req.query.client_id),
        redirect_uri: firstQueryString(req.query.redirect_uri),
        response_type: firstQueryString(req.query.response_type),
        state: firstQueryString(req.query.state),
      });
    } catch (e) {
      if (e instanceof ZodError) {
        return {
          kind: 'html',
          status: 400,
          body: oauthErrorPage('Некорректный запрос', zodMessage(e)),
        };
      }
      throw e;
    }

    const pool = await getDatabasePool();
    const connection = await pool.getConnection();
    try {
      const client = await findActiveClientWithOAuthRedirects(connection, params.client_id);
      if (!client) {
        return {
          kind: 'html',
          status: 400,
          body: oauthErrorPage('Клиент не найден', 'Неизвестный или неактивный client_id.'),
        };
      }
      if (client.oauthRedirectUris.length === 0) {
        return {
          kind: 'html',
          status: 400,
          body: oauthErrorPage(
            'OAuth не настроен',
            'Для этого клиента не заданы разрешённые redirect_uri.'
          ),
        };
      }
      if (!redirectAllowed(client.oauthRedirectUris, params.redirect_uri)) {
        return {
          kind: 'html',
          status: 400,
          body: oauthErrorPage(
            'Недопустимый redirect_uri',
            'Указанный redirect_uri не входит в список разрешённых для клиента.'
          ),
        };
      }

      const cookies = parseCookieHeader(req.headers.cookie);
      const browser = verifyOauthBrowserCookie(cookies[OAUTH_BROWSER_COOKIE_NAME]);
      if (browser) {
        const sessionOk = await isSessionActiveForUserAndClient(
          connection,
          browser.sid,
          browser.sub,
          client.id,
          SESSION_STATUS.ACTIVE
        );
        if (sessionOk) {
          const location = await mintAuthorizationCodeRedirect(connection, {
            clientId: client.id,
            userId: browser.sub,
            sessionId: browser.sid,
            redirectUri: params.redirect_uri,
            state: params.state,
          });
          return { kind: 'redirect', location };
        }
      }

      return {
        kind: 'html',
        status: 200,
        body: oauthLoginFormPage({
          clientName: client.name,
          clientId: params.client_id,
          redirectUri: params.redirect_uri,
          state: params.state ?? '',
        }),
      };
    } finally {
      connection.release();
    }
  },

  async handlePost(req: Request): Promise<AuthorizePostResult> {
    let body;
    try {
      body = oauthAuthorizePostBodySchema.parse(req.body);
    } catch (e) {
      if (e instanceof ZodError) {
        return {
          kind: 'html',
          status: 400,
          body: oauthErrorPage('Некорректный запрос', zodMessage(e)),
        };
      }
      throw e;
    }

    const pool = await getDatabasePool();
    const connection = await pool.getConnection();
    try {
      const client = await findActiveClientWithOAuthRedirects(connection, body.client_id);
      if (!client) {
        return {
          kind: 'html',
          status: 400,
          body: oauthErrorPage('Клиент не найден', 'Неизвестный или неактивный client_id.'),
        };
      }
      if (client.oauthRedirectUris.length === 0) {
        return {
          kind: 'html',
          status: 400,
          body: oauthErrorPage(
            'OAuth не настроен',
            'Для этого клиента не заданы разрешённые redirect_uri.'
          ),
        };
      }
      if (!redirectAllowed(client.oauthRedirectUris, body.redirect_uri)) {
        return {
          kind: 'html',
          status: 400,
          body: oauthErrorPage(
            'Недопустимый redirect_uri',
            'Указанный redirect_uri не входит в список разрешённых для клиента.'
          ),
        };
      }

      let loginResult;
      try {
        loginResult = await loginService.execute(
          {
            email: body.email,
            password: body.password,
            clientId: body.client_id,
          },
          {
            ipAddress: getClientIp(req),
            userAgent: getUserAgent(req),
          }
        );
      } catch (err) {
        if (err instanceof HttpError && err.statusCode === 401) {
          return {
            kind: 'html',
            status: 401,
            body: oauthLoginFormPage({
              clientName: client.name,
              errorMessage: 'Неверный email или пароль.',
              clientId: body.client_id,
              redirectUri: body.redirect_uri,
              state: body.state ?? '',
            }),
          };
        }
        throw err;
      }

      const cookie = signOauthBrowserCookie({
        sid: loginResult.session.id,
        sub: loginResult.user.id,
      });

      return {
        kind: 'redirect',
        location: buildAuthorizeQueryRedirect({
          client_id: body.client_id,
          redirect_uri: body.redirect_uri,
          state: body.state,
        }),
        setCookie: browserCookieHeader(cookie),
      };
    } finally {
      connection.release();
    }
  },
};
