import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../db/database', () => ({
  getDatabasePool: vi.fn(),
}));

import express from 'express';
import request from 'supertest';
import { getDatabasePool } from '../../../db/database';
import { oauthRouter } from '../../../modules/oauth/oauth.routes';
import { errorMiddleware } from '../../../middleware/error.middleware';
import { hashRefreshToken } from '../../../modules/auth/token.utils';

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
  slug: 'shop-web',
  name: 'Shop Web',
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
              client_slug: 'shop-web',
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
        client_id: 'shop-web',
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
        client_id: 'shop-web',
      });

    expect(res.status).toBe(400);
    expect(vi.mocked(getDatabasePool)).not.toHaveBeenCalled();
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
      client_id: 'shop-web',
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
      client_id: 'shop-web',
      redirect_uri: 'http://localhost:5173/oauth/callback',
      response_type: 'code',
    });
    const res = await request(buildApp()).get(`/oauth/authorize?${q.toString()}`);

    expect(res.status).toBe(200);
    expect(res.text).toContain('method="post"');
    expect(res.text).toContain('/oauth/authorize');
  });
});
