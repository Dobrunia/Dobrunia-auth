import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../db/database', () => ({
  getDatabasePool: vi.fn(),
}));

import express from 'express';
import request from 'supertest';
import { getDatabasePool } from '../../../db/database';
import { oauthRouter } from '../../../modules/oauth/oauth.routes';
import { errorMiddleware } from '../../../middleware/error.middleware';
import { hashRefreshToken, signAccessToken } from '../../../modules/auth/token.utils';
import {
  signOauthBrowserCookie,
  verifyOauthBrowserCookie,
} from '../../../modules/oauth/oauth-browser.jwt';
import { config } from '../../../config';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use('/oauth', oauthRouter);
  app.use(errorMiddleware);
  return app;
}

const CLIENT_ROW = {
  id: '11111111-1111-4111-8111-111111111111',
  slug: 'dobrunia-auth-web',
  name: 'Dobrunia Auth Web',
  oauth_redirect_uris: ['http://localhost:5173/oauth/callback'],
};

describe('POST /oauth/token', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('возвращает 200 и токены при валидном code и теле', async () => {
    const plainCode = 'oauth-auth-code-plain-test';
    const codeHash = hashRefreshToken(plainCode);

    const mockConnection = {
      beginTransaction: vi.fn().mockResolvedValue(undefined),
      commit: vi.fn().mockResolvedValue(undefined),
      rollback: vi.fn().mockResolvedValue(undefined),
      release: vi.fn(),
      query: vi
        .fn()
        .mockResolvedValueOnce([[{ id: CLIENT_ROW.id, slug: CLIENT_ROW.slug, name: CLIENT_ROW.name }]])
        .mockResolvedValueOnce([
          [
            {
              id: 'code-id-1',
              client_id: CLIENT_ROW.id,
              user_id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
              session_id: 'ssssssss-ssss-4sss-ssss-ssssssssssss',
              redirect_uri: 'http://localhost:5173/oauth/callback',
              client_slug: 'dobrunia-auth-web',
            },
          ],
        ])
        .mockResolvedValueOnce([[{ ok: 1 }]])
        .mockResolvedValueOnce([[{ email: 'tok@example.com' }]]),
      execute: vi.fn().mockResolvedValue([{ affectedRows: 1 }, []]),
    };
    vi.mocked(getDatabasePool).mockResolvedValue({
      getConnection: vi.fn().mockResolvedValue(mockConnection),
    } as never);

    const res = await request(buildApp())
      .post('/oauth/token')
      .send({
        grant_type: 'authorization_code',
        code: plainCode,
        redirect_uri: 'http://localhost:5173/oauth/callback',
        client_id: 'dobrunia-auth-web',
      });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('tok@example.com');
    expect(typeof res.body.accessToken).toBe('string');
    expect(typeof res.body.refreshToken).toBe('string');
    expect(mockConnection.query).toHaveBeenCalledWith(
      expect.stringContaining('oauth_authorization_codes'),
      [codeHash]
    );
    expect(mockConnection.execute).toHaveBeenCalledTimes(2);
    expect(mockConnection.commit).toHaveBeenCalled();
  });

  it('возвращает 400 при неверном grant_type', async () => {
    const res = await request(buildApp())
      .post('/oauth/token')
      .send({
        grant_type: 'implicit',
        code: 'x',
        redirect_uri: 'http://localhost/cb',
        client_id: 'dobrunia-auth-web',
      });

    expect(res.status).toBe(400);
    expect(vi.mocked(getDatabasePool)).not.toHaveBeenCalled();
  });
});

describe('POST /oauth/browser-session', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('возвращает 401 без Authorization', async () => {
    const res = await request(buildApp())
      .post('/oauth/browser-session')
      .send({ clientId: CLIENT_ROW.id });

    expect(res.status).toBe(401);
  });

  it('создаёт сессию целевого клиента для уже вошедшего пользователя', async () => {
    const sourceSessionId = 'source-session-1111';
    const userId = 'user-browser-1111';
    const token = signAccessToken({
      sub: userId,
      sid: sourceSessionId,
      email: 'browser@example.com',
    });
    const mockConnection = {
      beginTransaction: vi.fn().mockResolvedValue(undefined),
      commit: vi.fn().mockResolvedValue(undefined),
      rollback: vi.fn().mockResolvedValue(undefined),
      release: vi.fn(),
      query: vi
        .fn()
        .mockResolvedValueOnce([[
          {
            user_id: userId,
            email: 'browser@example.com',
            username: null,
            first_name: null,
            last_name: null,
            avatar_url: null,
            session_id: sourceSessionId,
            client_id: 'source-client-id',
            client_slug: 'dobrunia-auth-web',
            client_name: 'Dobrunia Auth Web',
          },
        ]])
        .mockResolvedValueOnce([[
          {
            id: CLIENT_ROW.id,
            slug: CLIENT_ROW.slug,
            name: CLIENT_ROW.name,
          },
        ]])
        .mockResolvedValueOnce([[]]),
      execute: vi.fn().mockResolvedValue([{ affectedRows: 1 }, []]),
    };
    vi.mocked(getDatabasePool).mockResolvedValue({
      getConnection: vi.fn().mockResolvedValue(mockConnection),
    } as never);

    const res = await request(buildApp())
      .post('/oauth/browser-session')
      .set('Authorization', `Bearer ${token}`)
      .set('User-Agent', 'OAuth bridge test')
      .send({ clientId: CLIENT_ROW.slug });

    expect(res.status).toBe(204);
    expect(res.headers['set-cookie']?.[0]).toContain('dobrunia_oauth=');
    expect(mockConnection.execute).toHaveBeenCalledOnce();
    expect(mockConnection.execute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO sessions'),
      expect.arrayContaining([userId, CLIENT_ROW.id, 'active', 'OAuth bridge test'])
    );
    expect(mockConnection.commit).toHaveBeenCalledOnce();
  });

  it('переиспользует существующую активную сессию целевого клиента', async () => {
    const sourceSessionId = 'source-session-previous';
    const targetSessionId = 'target-session-existing';
    const userId = 'user-browser-existing';
    const token = signAccessToken({
      sub: userId,
      sid: sourceSessionId,
      email: 'existing@example.com',
    });
    const mockConnection = {
      beginTransaction: vi.fn().mockResolvedValue(undefined),
      commit: vi.fn().mockResolvedValue(undefined),
      rollback: vi.fn().mockResolvedValue(undefined),
      release: vi.fn(),
      query: vi
        .fn()
        .mockResolvedValueOnce([[
          {
            user_id: userId,
            email: 'existing@example.com',
            username: null,
            first_name: null,
            last_name: null,
            avatar_url: null,
            session_id: sourceSessionId,
            client_id: 'source-client-id',
            client_slug: 'dobrunia-auth-web',
            client_name: 'Dobrunia Auth Web',
          },
        ]])
        .mockResolvedValueOnce([[
          {
            id: CLIENT_ROW.id,
            slug: CLIENT_ROW.slug,
            name: CLIENT_ROW.name,
          },
        ]])
        .mockResolvedValueOnce([[{ id: targetSessionId }]]),
      execute: vi.fn(),
    };
    vi.mocked(getDatabasePool).mockResolvedValue({
      getConnection: vi.fn().mockResolvedValue(mockConnection),
    } as never);

    const res = await request(buildApp())
      .post('/oauth/browser-session')
      .set('Authorization', `Bearer ${token}`)
      .send({ clientId: CLIENT_ROW.slug });

    expect(res.status).toBe(204);
    expect(mockConnection.execute).not.toHaveBeenCalled();
    const cookieValue = String(res.headers['set-cookie'][0])
      .split(';', 1)[0]
      .split('=', 2)[1];
    expect(verifyOauthBrowserCookie(cookieValue)).toEqual({
      sid: targetSessionId,
      sub: userId,
    });
  });

  it('переиспользует текущую сессию, если она уже относится к целевому клиенту', async () => {
    const sourceSessionId = 'source-session-2222';
    const userId = 'user-browser-2222';
    const token = signAccessToken({
      sub: userId,
      sid: sourceSessionId,
      email: 'same-client@example.com',
    });
    const mockConnection = {
      beginTransaction: vi.fn().mockResolvedValue(undefined),
      commit: vi.fn().mockResolvedValue(undefined),
      rollback: vi.fn().mockResolvedValue(undefined),
      release: vi.fn(),
      query: vi
        .fn()
        .mockResolvedValueOnce([[
          {
            user_id: userId,
            email: 'same-client@example.com',
            username: null,
            first_name: null,
            last_name: null,
            avatar_url: null,
            session_id: sourceSessionId,
            client_id: CLIENT_ROW.id,
            client_slug: CLIENT_ROW.slug,
            client_name: CLIENT_ROW.name,
          },
        ]])
        .mockResolvedValueOnce([[
          {
            id: CLIENT_ROW.id,
            slug: CLIENT_ROW.slug,
            name: CLIENT_ROW.name,
          },
        ]]),
      execute: vi.fn(),
    };
    vi.mocked(getDatabasePool).mockResolvedValue({
      getConnection: vi.fn().mockResolvedValue(mockConnection),
    } as never);

    const res = await request(buildApp())
      .post('/oauth/browser-session')
      .set('Authorization', `Bearer ${token}`)
      .send({ clientId: CLIENT_ROW.id });

    expect(res.status).toBe(204);
    expect(mockConnection.execute).not.toHaveBeenCalled();
    expect(mockConnection.commit).toHaveBeenCalledOnce();
  });

  it('ставит cookie first-party POST-запросом и делает 303 на проверенный returnUrl', async () => {
    const sourceSessionId = 'source-session-form';
    const userId = 'user-browser-form';
    const token = signAccessToken({
      sub: userId,
      sid: sourceSessionId,
      email: 'form@example.com',
    });
    const mockConnection = {
      beginTransaction: vi.fn().mockResolvedValue(undefined),
      commit: vi.fn().mockResolvedValue(undefined),
      rollback: vi.fn().mockResolvedValue(undefined),
      release: vi.fn(),
      query: vi
        .fn()
        .mockResolvedValueOnce([[
          {
            user_id: userId,
            email: 'form@example.com',
            username: null,
            first_name: null,
            last_name: null,
            avatar_url: null,
            session_id: sourceSessionId,
            client_id: CLIENT_ROW.id,
            client_slug: CLIENT_ROW.slug,
            client_name: CLIENT_ROW.name,
          },
        ]])
        .mockResolvedValueOnce([[
          {
            id: CLIENT_ROW.id,
            slug: CLIENT_ROW.slug,
            name: CLIENT_ROW.name,
          },
        ]]),
      execute: vi.fn(),
    };
    vi.mocked(getDatabasePool).mockResolvedValue({
      getConnection: vi.fn().mockResolvedValue(mockConnection),
    } as never);
    const returnUrl =
      'https://api.example/oauth/authorize' +
      '?response_type=code' +
      `&client_id=${CLIENT_ROW.slug}` +
      '&redirect_uri=http%3A%2F%2Flocalhost%3A5173%2Foauth%2Fcallback' +
      '&state=csrf-state' +
      '&_dobrunia_bridge_attempt=1';

    const res = await request(buildApp())
      .post('/oauth/browser-session')
      .set('Host', 'api.example')
      .set('X-Forwarded-Proto', 'https')
      .type('form')
      .send({
        accessToken: token,
        clientId: CLIENT_ROW.slug,
        returnUrl,
      });

    expect(res.status).toBe(303);
    expect(res.headers.location).toBe(returnUrl);
    expect(res.headers['set-cookie']?.[0]).toContain('dobrunia_oauth=');
    expect(mockConnection.commit).toHaveBeenCalledOnce();
  });

  it('не разрешает form handoff на другой origin', async () => {
    const token = signAccessToken({
      sub: 'user-browser-unsafe',
      sid: 'source-session-unsafe',
      email: 'unsafe@example.com',
    });
    const returnUrl =
      'https://attacker.example/oauth/authorize' +
      '?response_type=code' +
      `&client_id=${CLIENT_ROW.slug}` +
      '&redirect_uri=https%3A%2F%2Fapp.example%2Fcallback';

    const res = await request(buildApp())
      .post('/oauth/browser-session')
      .set('Host', 'api.example')
      .set('X-Forwarded-Proto', 'https')
      .type('form')
      .send({
        accessToken: token,
        clientId: CLIENT_ROW.slug,
        returnUrl,
      });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Invalid returnUrl');
    expect(vi.mocked(getDatabasePool)).not.toHaveBeenCalled();
  });

  it('отклоняет отсутствующий clientId до обращения к базе', async () => {
    const token = signAccessToken({
      sub: 'user-browser-3333',
      sid: 'source-session-3333',
      email: 'invalid@example.com',
    });

    const res = await request(buildApp())
      .post('/oauth/browser-session')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
    expect(vi.mocked(getDatabasePool)).not.toHaveBeenCalled();
  });

  it('не создаёт сессию для неизвестного или отключённого клиента', async () => {
    const token = signAccessToken({
      sub: 'user-browser-4444',
      sid: 'source-session-4444',
      email: 'unknown-client@example.com',
    });
    const mockConnection = {
      beginTransaction: vi.fn().mockResolvedValue(undefined),
      commit: vi.fn().mockResolvedValue(undefined),
      rollback: vi.fn().mockResolvedValue(undefined),
      release: vi.fn(),
      query: vi
        .fn()
        .mockResolvedValueOnce([[
          {
            user_id: 'user-browser-4444',
            email: 'unknown-client@example.com',
            username: null,
            first_name: null,
            last_name: null,
            avatar_url: null,
            session_id: 'source-session-4444',
            client_id: 'source-client-id',
            client_slug: 'dobrunia-auth-web',
            client_name: 'Dobrunia Auth Web',
          },
        ]])
        .mockResolvedValueOnce([[]]),
      execute: vi.fn(),
    };
    vi.mocked(getDatabasePool).mockResolvedValue({
      getConnection: vi.fn().mockResolvedValue(mockConnection),
    } as never);

    const res = await request(buildApp())
      .post('/oauth/browser-session')
      .set('Authorization', `Bearer ${token}`)
      .send({ clientId: 'missing-client' });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Unknown or inactive client');
    expect(mockConnection.execute).not.toHaveBeenCalled();
    expect(mockConnection.rollback).toHaveBeenCalledOnce();
  });
});

describe('GET /oauth/authorize', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('возвращает 400 HTML при отсутствии обязательных query', async () => {
    const res = await request(buildApp()).get('/oauth/authorize');

    expect(res.status).toBe(400);
    expect(res.text).toContain('html');
    expect(vi.mocked(getDatabasePool)).not.toHaveBeenCalled();
  });

  it('возвращает 400 HTML если у клиента нет redirect URIs', async () => {
    const mockConnection = {
      release: vi.fn(),
      query: vi.fn().mockResolvedValueOnce([
        [
          {
            id: CLIENT_ROW.id,
            slug: CLIENT_ROW.slug,
            name: CLIENT_ROW.name,
            oauth_redirect_uris: [],
          },
        ],
      ]),
    };
    vi.mocked(getDatabasePool).mockResolvedValue({
      getConnection: vi.fn().mockResolvedValue(mockConnection),
    } as never);

    const q = new URLSearchParams({
      client_id: 'dobrunia-auth-web',
      redirect_uri: 'http://localhost:5173/oauth/callback',
      response_type: 'code',
    });
    const res = await request(buildApp()).get(`/oauth/authorize?${q.toString()}`);

    expect(res.status).toBe(400);
    expect(res.text).toContain('OAuth');
  });

  it('возвращает 200 HTML форму входа при валидных параметрах и без куки', async () => {
    const mockConnection = {
      release: vi.fn(),
      query: vi.fn().mockResolvedValueOnce([
        [
          {
            id: CLIENT_ROW.id,
            slug: CLIENT_ROW.slug,
            name: CLIENT_ROW.name,
            oauth_redirect_uris: CLIENT_ROW.oauth_redirect_uris,
          },
        ],
      ]),
    };
    vi.mocked(getDatabasePool).mockResolvedValue({
      getConnection: vi.fn().mockResolvedValue(mockConnection),
    } as never);

    const q = new URLSearchParams({
      client_id: 'dobrunia-auth-web',
      redirect_uri: 'http://localhost:5173/oauth/callback',
      response_type: 'code',
    });
    const res = await request(buildApp()).get(`/oauth/authorize?${q.toString()}`);

    expect(res.status).toBe(200);
    expect(res.text).toContain('method="post"');
    expect(res.text).toContain('/oauth/authorize');
  });

  it('редиректит на корень auth-web и сохраняет полный return_url', async () => {
    const originalAuthWebUrl = config.oauth.authWebPublicUrl;
    (config.oauth as { authWebPublicUrl: string }).authWebPublicUrl =
      'https://auth.example';
    const mockConnection = {
      release: vi.fn(),
      query: vi.fn().mockResolvedValueOnce([[
        {
          id: CLIENT_ROW.id,
          slug: CLIENT_ROW.slug,
          name: CLIENT_ROW.name,
          oauth_redirect_uris: CLIENT_ROW.oauth_redirect_uris,
        },
      ]]),
    };
    vi.mocked(getDatabasePool).mockResolvedValue({
      getConnection: vi.fn().mockResolvedValue(mockConnection),
    } as never);

    try {
      const q = new URLSearchParams({
        client_id: CLIENT_ROW.slug,
        redirect_uri: 'http://localhost:5173/oauth/callback',
        response_type: 'code',
        state: 'state-with-symbols-&-=',
      });
      const res = await request(buildApp())
        .get(`/oauth/authorize?${q.toString()}`)
        .set('Host', 'api.example')
        .set('X-Forwarded-Proto', 'https');

      expect(res.status).toBe(302);
      const bridge = new URL(res.headers.location);
      expect(bridge.origin).toBe('https://auth.example');
      expect(bridge.pathname).toBe('/');
      expect(bridge.searchParams.get('oauth_bridge')).toBe('1');

      const nested = new URL(bridge.searchParams.get('return_url')!);
      expect(nested.origin).toBe('https://api.example');
      expect(nested.pathname).toBe('/oauth/authorize');
      expect(nested.searchParams.get('client_id')).toBe(CLIENT_ROW.slug);
      expect(nested.searchParams.get('redirect_uri')).toBe(
        'http://localhost:5173/oauth/callback'
      );
      expect(nested.searchParams.get('state')).toBe('state-with-symbols-&-=');
    } finally {
      (config.oauth as { authWebPublicUrl: string }).authWebPublicUrl =
        originalAuthWebUrl;
    }
  });

  it('сразу выдаёт code при действующей browser cookie целевого клиента', async () => {
    const userId = 'oauth-cookie-user';
    const sessionId = 'oauth-cookie-session';
    const cookie = signOauthBrowserCookie({ sub: userId, sid: sessionId });
    const mockConnection = {
      release: vi.fn(),
      query: vi
        .fn()
        .mockResolvedValueOnce([[
          {
            id: CLIENT_ROW.id,
            slug: CLIENT_ROW.slug,
            name: CLIENT_ROW.name,
            oauth_redirect_uris: CLIENT_ROW.oauth_redirect_uris,
          },
        ]])
        .mockResolvedValueOnce([[{ ok: 1 }]]),
      execute: vi.fn().mockResolvedValue([{ affectedRows: 1 }, []]),
    };
    vi.mocked(getDatabasePool).mockResolvedValue({
      getConnection: vi.fn().mockResolvedValue(mockConnection),
    } as never);

    const q = new URLSearchParams({
      client_id: CLIENT_ROW.slug,
      redirect_uri: 'http://localhost:5173/oauth/callback',
      response_type: 'code',
      state: 'return-state',
    });
    const res = await request(buildApp())
      .get(`/oauth/authorize?${q.toString()}`)
      .set('Cookie', `dobrunia_oauth=${cookie}`);

    expect(res.status).toBe(302);
    const callback = new URL(res.headers.location);
    expect(callback.origin).toBe('http://localhost:5173');
    expect(callback.pathname).toBe('/oauth/callback');
    expect(callback.searchParams.get('code')).toBeTruthy();
    expect(callback.searchParams.get('state')).toBe('return-state');
    expect(mockConnection.execute).toHaveBeenCalledWith(
      expect.stringContaining('oauth_authorization_codes'),
      expect.arrayContaining([CLIENT_ROW.id, userId, sessionId])
    );
  });
});
