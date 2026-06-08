import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../db/database', () => ({
  getDatabasePool: vi.fn(),
}));

import express from 'express';
import request from 'supertest';
import { getDatabasePool } from '../../../db/database';
import { clientsRouter } from '../../../modules/clients/clients.routes';
import { errorMiddleware } from '../../../middleware/error.middleware';
import { signAccessToken } from '../../../modules/auth/token.utils';

const USER_ID = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const SESSION_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

function token() {
  return signAccessToken({
    sub: USER_ID,
    sid: SESSION_ID,
    email: 'developer@example.com',
  });
}

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/clients', clientsRouter);
  app.use(errorMiddleware);
  return app;
}

function mockConnection() {
  return {
    beginTransaction: vi.fn().mockResolvedValue(undefined),
    commit: vi.fn().mockResolvedValue(undefined),
    rollback: vi.fn().mockResolvedValue(undefined),
    release: vi.fn(),
    query: vi.fn().mockResolvedValueOnce([[{ ok: 1 }]]),
    execute: vi.fn().mockResolvedValue([{ affectedRows: 1 }, []]),
  };
}

describe('POST /clients', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('регистрирует OAuth-клиента для текущего пользователя', async () => {
    const connection = mockConnection();
    vi.mocked(getDatabasePool).mockResolvedValue({
      getConnection: vi.fn().mockResolvedValue(connection),
    } as never);

    const response = await request(buildApp())
      .post('/clients')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        name: 'Local Test App',
        slug: ' Local-Test-App ',
        description: 'Приложение для локальной разработки',
        baseUrl: 'http://localhost:4173',
        logoUrl: 'http://localhost:4173/logo.png',
        redirectUris: [
          'http://localhost:4173/oauth/callback',
          'https://example.com/auth/dobrunia/callback',
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body.client).toMatchObject({
      name: 'Local Test App',
      slug: 'local-test-app',
      description: 'Приложение для локальной разработки',
      baseUrl: 'http://localhost:4173',
      logoUrl: 'http://localhost:4173/logo.png',
      redirectUris: [
        'http://localhost:4173/oauth/callback',
        'https://example.com/auth/dobrunia/callback',
      ],
      isActive: true,
    });
    expect(response.body.client.id).toEqual(expect.any(String));
    expect(response.body.client.createdAt).toEqual(expect.any(String));

    expect(connection.execute).toHaveBeenCalledTimes(1);
    const insertParams = connection.execute.mock.calls[0][1] as unknown[];
    expect(insertParams[1]).toBe(USER_ID);
    expect(insertParams[2]).toBe('Local Test App');
    expect(insertParams[3]).toBe('local-test-app');
    expect(insertParams[7]).toBe(
      JSON.stringify([
        'http://localhost:4173/oauth/callback',
        'https://example.com/auth/dobrunia/callback',
      ])
    );
    expect(connection.commit).toHaveBeenCalledOnce();
  });

  it('требует действующий access token', async () => {
    const response = await request(buildApp()).post('/clients').send({
      name: 'Local Test App',
      slug: 'local-test-app',
      redirectUris: ['http://localhost:4173/oauth/callback'],
    });

    expect(response.status).toBe(401);
    expect(vi.mocked(getDatabasePool)).not.toHaveBeenCalled();
  });

  it('отклоняет HTTP redirect URI вне loopback-разработки', async () => {
    const connection = mockConnection();
    vi.mocked(getDatabasePool).mockResolvedValue({
      getConnection: vi.fn().mockResolvedValue(connection),
    } as never);

    const response = await request(buildApp())
      .post('/clients')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        name: 'Unsafe App',
        slug: 'unsafe-app',
        redirectUris: ['http://example.com/oauth/callback'],
      });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toContain('Use HTTPS');
    expect(connection.beginTransaction).not.toHaveBeenCalled();
    expect(connection.execute).not.toHaveBeenCalled();
  });

  it('возвращает 409 при уже занятом slug', async () => {
    const connection = mockConnection();
    connection.execute.mockRejectedValueOnce({ code: 'ER_DUP_ENTRY' });
    vi.mocked(getDatabasePool).mockResolvedValue({
      getConnection: vi.fn().mockResolvedValue(connection),
    } as never);

    const response = await request(buildApp())
      .post('/clients')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        name: 'Duplicate App',
        slug: 'duplicate-app',
        redirectUris: ['https://example.com/oauth/callback'],
      });

    expect(response.status).toBe(409);
    expect(response.body.error.message).toBe('Client slug already exists');
    expect(connection.rollback).toHaveBeenCalledOnce();
  });

  it('отклоняет повторяющиеся redirect URI', async () => {
    const connection = mockConnection();
    vi.mocked(getDatabasePool).mockResolvedValue({
      getConnection: vi.fn().mockResolvedValue(connection),
    } as never);

    const response = await request(buildApp())
      .post('/clients')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        name: 'Duplicate Redirect App',
        slug: 'duplicate-redirect-app',
        redirectUris: [
          'https://example.com/oauth/callback',
          'https://example.com/oauth/callback',
        ],
      });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toContain('must not contain duplicates');
    expect(connection.execute).not.toHaveBeenCalled();
  });
});

describe('GET /clients', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('возвращает только клиентов текущего пользователя', async () => {
    const connection = mockConnection();
    connection.query.mockResolvedValueOnce([
      [
        {
          id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
          name: 'Local Test App',
          slug: 'local-test-app',
          description: 'Приложение для разработки',
          base_url: 'http://localhost:4173',
          logo_url: null,
          oauth_redirect_uris: JSON.stringify([
            'http://localhost:4173/oauth/callback',
          ]),
          is_active: 1,
          created_at: new Date('2026-06-08T10:00:00.000Z'),
        },
      ],
    ]);
    vi.mocked(getDatabasePool).mockResolvedValue({
      getConnection: vi.fn().mockResolvedValue(connection),
    } as never);

    const response = await request(buildApp())
      .get('/clients')
      .set('Authorization', `Bearer ${token()}`);

    expect(response.status).toBe(200);
    expect(response.body.clients).toEqual([
      {
        id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        name: 'Local Test App',
        slug: 'local-test-app',
        description: 'Приложение для разработки',
        baseUrl: 'http://localhost:4173',
        logoUrl: null,
        redirectUris: ['http://localhost:4173/oauth/callback'],
        isActive: true,
        createdAt: '2026-06-08T10:00:00.000Z',
      },
    ]);
    expect(connection.query).toHaveBeenLastCalledWith(
      expect.stringContaining('WHERE owner_user_id = ?'),
      [USER_ID]
    );
  });

  it('требует действующий access token', async () => {
    const response = await request(buildApp()).get('/clients');

    expect(response.status).toBe(401);
    expect(vi.mocked(getDatabasePool)).not.toHaveBeenCalled();
  });
});
