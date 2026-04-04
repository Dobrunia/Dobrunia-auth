import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../db/database', () => ({
  getDatabasePool: vi.fn(),
}));

import express from 'express';
import request from 'supertest';
import { getDatabasePool } from '../../../db/database';
import { sessionsRouter } from '../../../modules/sessions/sessions.routes';
import { clientsRouter } from '../../../modules/clients/clients.routes';
import { errorMiddleware } from '../../../middleware/error.middleware';
import { signAccessToken } from '../../../modules/auth/token.utils';

const USER_ID = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const SESS_ID = 'ssssssss-ssss-4sss-ssss-ssssssssssss';

function token() {
  return signAccessToken({
    sub: USER_ID,
    sid: SESS_ID,
    email: 'sessions-test@example.com',
  });
}

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/sessions', sessionsRouter);
  app.use('/clients', clientsRouter);
  app.use(errorMiddleware);
  return app;
}

describe('GET /sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('возвращает 200 и список при валидном Bearer', async () => {
    const row = {
      id: SESS_ID,
      user_id: USER_ID,
      client_id: '11111111-1111-4111-8111-111111111111',
      status: 'active',
      ip_address: '127.0.0.1',
      user_agent: 'vitest',
      last_seen_at: new Date('2026-01-01T12:00:00.000Z'),
      created_at: new Date('2026-01-01T10:00:00.000Z'),
      revoked_at: null,
      revoke_reason: null,
      client_slug: 'dobrunia-auth-web',
      client_name: 'Dobrunia Auth Web',
    };
    const mockConnection = {
      release: vi.fn(),
      query: vi
        .fn()
        .mockResolvedValueOnce([[{ ok: 1 }]])
        .mockResolvedValueOnce([[row]]),
    };
    vi.mocked(getDatabasePool).mockResolvedValue({
      getConnection: vi.fn().mockResolvedValue(mockConnection),
    } as never);

    const res = await request(buildApp())
      .get('/sessions')
      .set('Authorization', `Bearer ${token()}`);

    expect(res.status).toBe(200);
    expect(res.body.sessions).toHaveLength(1);
    expect(res.body.sessions[0].id).toBe(SESS_ID);
    expect(res.body.sessions[0].clientSlug).toBe('dobrunia-auth-web');
    expect(res.body.sessions[0].lastSeenAt).toBe('2026-01-01T12:00:00.000Z');
  });

  it('возвращает 401 без Authorization', async () => {
    const res = await request(buildApp()).get('/sessions');
    expect(res.status).toBe(401);
    expect(vi.mocked(getDatabasePool)).not.toHaveBeenCalled();
  });

  it('возвращает 401 если access JWT привязан к неактивной/отозванной сессии', async () => {
    const mockConnection = {
      release: vi.fn(),
      query: vi.fn().mockResolvedValueOnce([[]]),
    };
    vi.mocked(getDatabasePool).mockResolvedValue({
      getConnection: vi.fn().mockResolvedValue(mockConnection),
    } as never);

    const res = await request(buildApp())
      .get('/sessions')
      .set('Authorization', `Bearer ${token()}`);

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid or expired access token');
  });
});

describe('DELETE /sessions/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('возвращает 204 и отзывает сессию при владении', async () => {
    const mockConnection = {
      beginTransaction: vi.fn().mockResolvedValue(undefined),
      commit: vi.fn().mockResolvedValue(undefined),
      rollback: vi.fn().mockResolvedValue(undefined),
      release: vi.fn(),
      query: vi
        .fn()
        .mockResolvedValueOnce([[{ ok: 1 }]])
        .mockResolvedValueOnce([[{ id: SESS_ID }]]),
      execute: vi.fn().mockResolvedValue([{ affectedRows: 1 }, []]),
    };
    vi.mocked(getDatabasePool).mockResolvedValue({
      getConnection: vi.fn().mockResolvedValue(mockConnection),
    } as never);

    const res = await request(buildApp())
      .delete(`/sessions/${SESS_ID}`)
      .set('Authorization', `Bearer ${token()}`);

    expect(res.status).toBe(204);
    expect(res.text).toBe('');
    expect(mockConnection.execute).toHaveBeenCalledTimes(2);
    expect(String(mockConnection.execute.mock.calls[0][0])).toContain('refresh_tokens');
    expect(String(mockConnection.execute.mock.calls[1][0])).toContain('sessions');
    expect(mockConnection.commit).toHaveBeenCalled();
  });

  it('возвращает 404 если сессия не принадлежит пользователю', async () => {
    const mockConnection = {
      beginTransaction: vi.fn().mockResolvedValue(undefined),
      commit: vi.fn().mockResolvedValue(undefined),
      rollback: vi.fn().mockResolvedValue(undefined),
      release: vi.fn(),
      query: vi
        .fn()
        .mockResolvedValueOnce([[{ ok: 1 }]])
        .mockResolvedValueOnce([[]]),
      execute: vi.fn(),
    };
    vi.mocked(getDatabasePool).mockResolvedValue({
      getConnection: vi.fn().mockResolvedValue(mockConnection),
    } as never);

    const res = await request(buildApp())
      .delete('/sessions/unknown-uuid-0000-4000-8000-000000000001')
      .set('Authorization', `Bearer ${token()}`);

    expect(res.status).toBe(404);
    expect(mockConnection.beginTransaction).not.toHaveBeenCalled();
  });
});

describe('GET /clients/:id/sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('возвращает 200 и сессии по клиенту', async () => {
    const row = {
      id: SESS_ID,
      user_id: USER_ID,
      client_id: '11111111-1111-4111-8111-111111111111',
      status: 'active',
      ip_address: null,
      user_agent: null,
      last_seen_at: null,
      created_at: new Date('2026-01-01T10:00:00.000Z'),
      revoked_at: null,
      revoke_reason: null,
      client_slug: 'dobrunia-auth-web',
      client_name: 'Dobrunia Auth Web',
    };
    const mockConnection = {
      release: vi.fn(),
      query: vi
        .fn()
        .mockResolvedValueOnce([[{ ok: 1 }]])
        .mockResolvedValueOnce([[{ id: '11111111-1111-4111-8111-111111111111', slug: 'dobrunia-auth-web', name: 'Dobrunia Auth Web' }]])
        .mockResolvedValueOnce([[row]]),
    };
    vi.mocked(getDatabasePool).mockResolvedValue({
      getConnection: vi.fn().mockResolvedValue(mockConnection),
    } as never);

    const res = await request(buildApp())
      .get('/clients/dobrunia-auth-web/sessions')
      .set('Authorization', `Bearer ${token()}`);

    expect(res.status).toBe(200);
    expect(res.body.sessions).toHaveLength(1);
    expect(res.body.sessions[0].clientId).toBe('11111111-1111-4111-8111-111111111111');
  });

  it('возвращает 404 если клиент не найден', async () => {
    const mockConnection = {
      release: vi.fn(),
      query: vi
        .fn()
        .mockResolvedValueOnce([[{ ok: 1 }]])
        .mockResolvedValueOnce([[]]),
    };
    vi.mocked(getDatabasePool).mockResolvedValue({
      getConnection: vi.fn().mockResolvedValue(mockConnection),
    } as never);

    const res = await request(buildApp())
      .get('/clients/unknown-app/sessions')
      .set('Authorization', `Bearer ${token()}`);

    expect(res.status).toBe(404);
  });
});
