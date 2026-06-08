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
const CLIENT_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

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

function ownedClientRow(overrides: Record<string, unknown> = {}) {
  return {
    id: CLIENT_ID,
    name: 'Owned App',
    slug: 'owned-app',
    description: null,
    base_url: null,
    logo_url: null,
    oauth_redirect_uris: JSON.stringify(['https://app.example/callback']),
    is_active: 1,
    active_session_count: 1,
    active_user_count: 1,
    created_at: new Date('2026-06-08T10:00:00.000Z'),
    ...overrides,
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
    expect(Object.keys(response.body.client).sort()).toEqual([
      'activeSessionCount',
      'activeUserCount',
      'baseUrl',
      'createdAt',
      'description',
      'id',
      'isActive',
      'logoUrl',
      'name',
      'redirectUris',
      'slug',
    ]);

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

  it('не позволяет назначить владельца через тело запроса', async () => {
    const connection = mockConnection();
    vi.mocked(getDatabasePool).mockResolvedValue({
      getConnection: vi.fn().mockResolvedValue(connection),
    } as never);

    const response = await request(buildApp())
      .post('/clients')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        name: 'Injected Owner App',
        slug: 'injected-owner-app',
        redirectUris: ['https://example.com/oauth/callback'],
        ownerUserId: 'attacker-selected-user',
      });

    expect(response.status).toBe(400);
    expect(connection.query).toHaveBeenCalledOnce();
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
          active_session_count: '4',
          active_user_count: '3',
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
        activeSessionCount: 4,
        activeUserCount: 3,
        createdAt: '2026-06-08T10:00:00.000Z',
      },
    ]);
    expect(connection.query).toHaveBeenLastCalledWith(
      expect.stringContaining('WHERE c.owner_user_id = ?'),
      ['active', USER_ID]
    );
  });

  it('требует действующий access token', async () => {
    const response = await request(buildApp()).get('/clients');

    expect(response.status).toBe(401);
    expect(vi.mocked(getDatabasePool)).not.toHaveBeenCalled();
  });
});

describe('PATCH /clients/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('обновляет принадлежащий пользователю клиент', async () => {
    const connection = mockConnection();
    const current = {
      id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      name: 'Old name',
      slug: 'old-name',
      description: null,
      base_url: null,
      logo_url: null,
      oauth_redirect_uris: JSON.stringify(['https://app.example/callback']),
      is_active: 1,
      active_session_count: 2,
      active_user_count: 2,
      created_at: new Date('2026-06-08T10:00:00.000Z'),
    };
    connection.query
      .mockResolvedValueOnce([[current]])
      .mockResolvedValueOnce([[
        {
          ...current,
          name: 'New name',
          description: 'Updated',
          oauth_redirect_uris: JSON.stringify([
            'https://app.example/callback',
            'https://app.example/second-callback',
          ]),
        },
      ]]);
    vi.mocked(getDatabasePool).mockResolvedValue({
      getConnection: vi.fn().mockResolvedValue(connection),
    } as never);

    const response = await request(buildApp())
      .patch(`/clients/${current.id}`)
      .set('Authorization', `Bearer ${token()}`)
      .send({
        name: 'New name',
        description: 'Updated',
        redirectUris: [
          'https://app.example/callback',
          'https://app.example/second-callback',
        ],
      });

    expect(response.status).toBe(200);
    expect(response.body.client).toMatchObject({
      id: current.id,
      name: 'New name',
      description: 'Updated',
      activeSessionCount: 2,
      activeUserCount: 2,
    });
    expect(response.body.client).not.toHaveProperty('ownerUserId');
    expect(response.body.client).not.toHaveProperty('owner_user_id');
    expect(connection.execute).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE clients SET'),
      expect.arrayContaining([
        'New name',
        JSON.stringify([
          'https://app.example/callback',
          'https://app.example/second-callback',
        ]),
        current.id,
        USER_ID,
      ])
    );
  });

  it('не позволяет редактировать чужой клиент', async () => {
    const connection = mockConnection();
    connection.query.mockResolvedValueOnce([[]]);
    vi.mocked(getDatabasePool).mockResolvedValue({
      getConnection: vi.fn().mockResolvedValue(connection),
    } as never);

    const response = await request(buildApp())
      .patch('/clients/foreign-client')
      .set('Authorization', `Bearer ${token()}`)
      .send({ name: 'Changed' });

    expect(response.status).toBe(404);
    expect(connection.execute).not.toHaveBeenCalled();
  });

  it('требует действующий access token', async () => {
    const response = await request(buildApp())
      .patch(`/clients/${CLIENT_ID}`)
      .send({ name: 'Changed' });

    expect(response.status).toBe(401);
    expect(vi.mocked(getDatabasePool)).not.toHaveBeenCalled();
  });

  it('отклоняет пустое тело и неизвестные поля', async () => {
    const emptyConnection = mockConnection();
    const injectedConnection = mockConnection();
    const getConnection = vi
      .fn()
      .mockResolvedValueOnce(emptyConnection)
      .mockResolvedValueOnce(injectedConnection);
    vi.mocked(getDatabasePool).mockResolvedValue({ getConnection } as never);

    const emptyResponse = await request(buildApp())
      .patch(`/clients/${CLIENT_ID}`)
      .set('Authorization', `Bearer ${token()}`)
      .send({});
    const injectedResponse = await request(buildApp())
      .patch(`/clients/${CLIENT_ID}`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ ownerUserId: 'attacker-selected-user' });

    expect(emptyResponse.status).toBe(400);
    expect(injectedResponse.status).toBe(400);
    expect(emptyConnection.query).toHaveBeenCalledOnce();
    expect(injectedConnection.query).toHaveBeenCalledOnce();
    expect(emptyConnection.execute).not.toHaveBeenCalled();
    expect(injectedConnection.execute).not.toHaveBeenCalled();
  });

  it('применяет деактивацию и очищает необязательные URL', async () => {
    const connection = mockConnection();
    connection.query
      .mockResolvedValueOnce([[ownedClientRow({
        base_url: 'https://app.example',
        logo_url: 'https://app.example/logo.png',
      })]])
      .mockResolvedValueOnce([[ownedClientRow({
        base_url: null,
        logo_url: null,
        is_active: 0,
      })]]);
    vi.mocked(getDatabasePool).mockResolvedValue({
      getConnection: vi.fn().mockResolvedValue(connection),
    } as never);

    const response = await request(buildApp())
      .patch(`/clients/${CLIENT_ID}`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ baseUrl: '', logoUrl: '', isActive: false });

    expect(response.status).toBe(200);
    expect(response.body.client).toMatchObject({
      id: CLIENT_ID,
      baseUrl: null,
      logoUrl: null,
      isActive: false,
    });
    const updateParams = connection.execute.mock.calls[0][1] as unknown[];
    expect(updateParams[3]).toBeNull();
    expect(updateParams[4]).toBeNull();
    expect(updateParams[6]).toBe(0);
    expect(updateParams.slice(-2)).toEqual([CLIENT_ID, USER_ID]);
  });

  it('отклоняет небезопасный callback URL до обращения к базе', async () => {
    const connection = mockConnection();
    vi.mocked(getDatabasePool).mockResolvedValue({
      getConnection: vi.fn().mockResolvedValue(connection),
    } as never);

    const response = await request(buildApp())
      .patch(`/clients/${CLIENT_ID}`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ redirectUris: ['http://public.example/callback'] });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toContain('Use HTTPS');
    expect(connection.query).toHaveBeenCalledOnce();
    expect(connection.execute).not.toHaveBeenCalled();
  });

  it('возвращает 409 при конфликте slug во время обновления', async () => {
    const connection = mockConnection();
    connection.query.mockResolvedValueOnce([[ownedClientRow()]]);
    connection.execute.mockRejectedValueOnce({ code: 'ER_DUP_ENTRY' });
    vi.mocked(getDatabasePool).mockResolvedValue({
      getConnection: vi.fn().mockResolvedValue(connection),
    } as never);

    const response = await request(buildApp())
      .patch(`/clients/${CLIENT_ID}`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ slug: 'already-owned' });

    expect(response.status).toBe(409);
    expect(response.body.error.message).toBe('Client slug already exists');
    expect(connection.release).toHaveBeenCalledTimes(2);
  });
});

describe('DELETE /clients/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('удаляет принадлежащий пользователю клиент', async () => {
    const connection = mockConnection();
    vi.mocked(getDatabasePool).mockResolvedValue({
      getConnection: vi.fn().mockResolvedValue(connection),
    } as never);

    const response = await request(buildApp())
      .delete('/clients/client-owned')
      .set('Authorization', `Bearer ${token()}`);

    expect(response.status).toBe(204);
    expect(connection.execute).toHaveBeenCalledWith(
      'DELETE FROM clients WHERE id = ? AND owner_user_id = ?',
      ['client-owned', USER_ID]
    );
  });

  it('возвращает 404 для чужого клиента', async () => {
    const connection = mockConnection();
    connection.execute.mockResolvedValueOnce([{ affectedRows: 0 }, []]);
    vi.mocked(getDatabasePool).mockResolvedValue({
      getConnection: vi.fn().mockResolvedValue(connection),
    } as never);

    const response = await request(buildApp())
      .delete('/clients/foreign-client')
      .set('Authorization', `Bearer ${token()}`);

    expect(response.status).toBe(404);
  });

  it('требует действующий access token', async () => {
    const response = await request(buildApp()).delete(`/clients/${CLIENT_ID}`);

    expect(response.status).toBe(401);
    expect(vi.mocked(getDatabasePool)).not.toHaveBeenCalled();
  });
});

describe('owner client sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('возвращает активные сессии принадлежащего приложения', async () => {
    const connection = mockConnection();
    connection.query
      .mockResolvedValueOnce([[
        {
          id: 'client-owned',
          name: 'Owned App',
          slug: 'owned-app',
          description: null,
          base_url: null,
          logo_url: null,
          oauth_redirect_uris: '[]',
          is_active: 1,
          active_session_count: 1,
          active_user_count: 1,
          created_at: new Date('2026-06-08T10:00:00.000Z'),
        },
      ]])
      .mockResolvedValueOnce([[
        {
          id: 'session-user-1',
          user_id: 'user-1',
          email: 'member@example.com',
          username: 'member',
          first_name: 'Иван',
          last_name: 'Петров',
          ip_address: '127.0.0.1',
          user_agent: 'Test browser',
          last_seen_at: new Date('2026-06-08T11:00:00.000Z'),
          created_at: new Date('2026-06-08T10:30:00.000Z'),
        },
      ]]);
    vi.mocked(getDatabasePool).mockResolvedValue({
      getConnection: vi.fn().mockResolvedValue(connection),
    } as never);

    const response = await request(buildApp())
      .get('/clients/client-owned/management/sessions')
      .set('Authorization', `Bearer ${token()}`);

    expect(response.status).toBe(200);
    expect(response.body.sessions).toEqual([
      {
        id: 'session-user-1',
        userId: 'user-1',
        userEmail: 'member@example.com',
        userDisplayName: 'Иван Петров',
        ipAddress: '127.0.0.1',
        userAgent: 'Test browser',
        lastSeenAt: '2026-06-08T11:00:00.000Z',
        createdAt: '2026-06-08T10:30:00.000Z',
      },
    ]);
    expect(connection.query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('WHERE s.client_id = ? AND s.status = ?'),
      ['client-owned', 'active']
    );
  });

  it('отзывает сессию пользователя приложения владельцем', async () => {
    const connection = mockConnection();
    connection.query
      .mockResolvedValueOnce([[
        {
          id: 'client-owned',
          name: 'Owned App',
          slug: 'owned-app',
          description: null,
          base_url: null,
          logo_url: null,
          oauth_redirect_uris: '[]',
          is_active: 1,
          active_session_count: 1,
          active_user_count: 1,
          created_at: new Date('2026-06-08T10:00:00.000Z'),
        },
      ]])
      .mockResolvedValueOnce([[{ ok: 1 }]]);
    vi.mocked(getDatabasePool).mockResolvedValue({
      getConnection: vi.fn().mockResolvedValue(connection),
    } as never);

    const response = await request(buildApp())
      .delete('/clients/client-owned/management/sessions/session-user-1')
      .set('Authorization', `Bearer ${token()}`);

    expect(response.status).toBe(204);
    expect(connection.execute).toHaveBeenCalledTimes(2);
    expect(String(connection.execute.mock.calls[0][0])).toContain('refresh_tokens');
    expect(connection.execute.mock.calls[0][1]).toContain('client_owner_revoked');
    expect(connection.commit).toHaveBeenCalledOnce();
  });

  it('требует access token для просмотра и отзыва сессий', async () => {
    const listResponse = await request(buildApp())
      .get(`/clients/${CLIENT_ID}/management/sessions`);
    const revokeResponse = await request(buildApp())
      .delete(`/clients/${CLIENT_ID}/management/sessions/${SESSION_ID}`);

    expect(listResponse.status).toBe(401);
    expect(revokeResponse.status).toBe(401);
    expect(vi.mocked(getDatabasePool)).not.toHaveBeenCalled();
  });

  it('не раскрывает сессии чужого приложения', async () => {
    const connection = mockConnection();
    connection.query.mockResolvedValueOnce([[]]);
    vi.mocked(getDatabasePool).mockResolvedValue({
      getConnection: vi.fn().mockResolvedValue(connection),
    } as never);

    const response = await request(buildApp())
      .get('/clients/foreign-client/management/sessions')
      .set('Authorization', `Bearer ${token()}`);

    expect(response.status).toBe(404);
    expect(response.body.error.message).toBe('Client not found');
    expect(connection.query).toHaveBeenCalledTimes(2);
  });

  it('не позволяет владельцу отозвать сессию другого приложения', async () => {
    const connection = mockConnection();
    connection.query
      .mockResolvedValueOnce([[ownedClientRow()]])
      .mockResolvedValueOnce([[]]);
    vi.mocked(getDatabasePool).mockResolvedValue({
      getConnection: vi.fn().mockResolvedValue(connection),
    } as never);

    const response = await request(buildApp())
      .delete(`/clients/${CLIENT_ID}/management/sessions/foreign-session`)
      .set('Authorization', `Bearer ${token()}`);

    expect(response.status).toBe(404);
    expect(response.body.error.message).toBe('Session not found');
    expect(connection.query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('WHERE id = ? AND client_id = ? AND status = ?'),
      ['foreign-session', CLIENT_ID, 'active']
    );
    expect(connection.beginTransaction).not.toHaveBeenCalled();
    expect(connection.execute).not.toHaveBeenCalled();
  });

  it('не позволяет владельцу чужого приложения отзывать его сессии', async () => {
    const connection = mockConnection();
    connection.query.mockResolvedValueOnce([[]]);
    vi.mocked(getDatabasePool).mockResolvedValue({
      getConnection: vi.fn().mockResolvedValue(connection),
    } as never);

    const response = await request(buildApp())
      .delete('/clients/foreign-client/management/sessions/foreign-session')
      .set('Authorization', `Bearer ${token()}`);

    expect(response.status).toBe(404);
    expect(response.body.error.message).toBe('Session not found');
    expect(connection.query).toHaveBeenCalledTimes(2);
    expect(connection.beginTransaction).not.toHaveBeenCalled();
    expect(connection.execute).not.toHaveBeenCalled();
  });

  it('откатывает транзакцию, если отзыв refresh-токенов завершился ошибкой', async () => {
    const connection = mockConnection();
    connection.query
      .mockResolvedValueOnce([[ownedClientRow()]])
      .mockResolvedValueOnce([[{ ok: 1 }]]);
    connection.execute.mockRejectedValueOnce(new Error('database failure'));
    vi.mocked(getDatabasePool).mockResolvedValue({
      getConnection: vi.fn().mockResolvedValue(connection),
    } as never);

    const response = await request(buildApp())
      .delete(`/clients/${CLIENT_ID}/management/sessions/${SESSION_ID}`)
      .set('Authorization', `Bearer ${token()}`);

    expect(response.status).toBe(500);
    expect(connection.beginTransaction).toHaveBeenCalledOnce();
    expect(connection.rollback).toHaveBeenCalledOnce();
    expect(connection.commit).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalledTimes(2);
  });
});
