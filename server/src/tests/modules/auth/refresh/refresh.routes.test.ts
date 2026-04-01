import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../db/database', () => ({
  getDatabasePool: vi.fn(),
}));

import express from 'express';
import request from 'supertest';
import { getDatabasePool } from '../../../../db/database';
import { authRouter } from '../../../../modules/auth/auth.routes';
import { errorMiddleware } from '../../../../middleware/error.middleware';
import { hashRefreshToken } from '../../../../modules/auth/token.utils';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/auth', authRouter);
  app.use(errorMiddleware);
  return app;
}

const ROTATION_ROW = {
  id: 'rt-old-1111-4111-8111-111111111111',
  session_id: 'sess-2222-4222-8222-222222222222',
  user_id: 'user-3333-4333-8333-333333333333',
  family_id: 'fam-4444-4444-4444-444444444444',
  email: 'refresh@example.com',
};

describe('POST /auth/refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('возвращает 200, новый access и refresh при валидном refresh и активной сессии', async () => {
    const plainRefresh = 'opaque-refresh-rotation-test-xyz';
    const tokenHash = hashRefreshToken(plainRefresh);

    const mockConnection = {
      beginTransaction: vi.fn().mockResolvedValue(undefined),
      commit: vi.fn().mockResolvedValue(undefined),
      rollback: vi.fn().mockResolvedValue(undefined),
      release: vi.fn(),
      query: vi
        .fn()
        .mockResolvedValueOnce([[ROTATION_ROW]])
        .mockResolvedValueOnce([[{ ok: 1 }]]),
      execute: vi.fn().mockResolvedValue([{ affectedRows: 1 }, []]),
    };
    vi.mocked(getDatabasePool).mockResolvedValue({
      getConnection: vi.fn().mockResolvedValue(mockConnection),
    } as never);

    const res = await request(buildApp())
      .post('/auth/refresh')
      .send({ refreshToken: plainRefresh });

    expect(res.status).toBe(200);
    expect(typeof res.body.accessToken).toBe('string');
    expect(typeof res.body.refreshToken).toBe('string');
    expect(res.body.refreshToken).not.toBe(plainRefresh);
    expect(Object.keys(res.body).sort()).toEqual(['accessToken', 'refreshToken'].sort());

    expect(mockConnection.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('refresh_tokens'),
      [tokenHash]
    );
    expect(mockConnection.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('sessions'),
      [ROTATION_ROW.session_id, ROTATION_ROW.user_id, 'active']
    );
    expect(mockConnection.execute).toHaveBeenCalledTimes(2);
    expect(mockConnection.commit).toHaveBeenCalled();
  });

  it('использует id старого токена как family_id, если family_id NULL', async () => {
    const plainRefresh = 'opaque-no-family-abc';
    const row = { ...ROTATION_ROW, family_id: null };

    const mockConnection = {
      beginTransaction: vi.fn().mockResolvedValue(undefined),
      commit: vi.fn().mockResolvedValue(undefined),
      rollback: vi.fn().mockResolvedValue(undefined),
      release: vi.fn(),
      query: vi
        .fn()
        .mockResolvedValueOnce([[row]])
        .mockResolvedValueOnce([[{ ok: 1 }]]),
      execute: vi.fn().mockResolvedValue([{ affectedRows: 1 }, []]),
    };
    vi.mocked(getDatabasePool).mockResolvedValue({
      getConnection: vi.fn().mockResolvedValue(mockConnection),
    } as never);

    const res = await request(buildApp())
      .post('/auth/refresh')
      .send({ refreshToken: plainRefresh });

    expect(res.status).toBe(200);
    const insertCall = mockConnection.execute.mock.calls.find((c) =>
      String(c[0]).includes('INSERT INTO refresh_tokens')
    );
    expect(insertCall).toBeDefined();
    const bind = insertCall![1] as unknown[];
    expect(bind[1]).toBe(row.session_id);
    expect(bind[2]).toBe(row.user_id);
    expect(bind[4]).toBe(row.id);
    expect(bind[5]).toBe(row.id);
  });

  it('возвращает 401 при неизвестном или просроченном refresh', async () => {
    const mockConnection = {
      beginTransaction: vi.fn().mockResolvedValue(undefined),
      commit: vi.fn().mockResolvedValue(undefined),
      rollback: vi.fn().mockResolvedValue(undefined),
      release: vi.fn(),
      query: vi.fn().mockResolvedValueOnce([[]]),
      execute: vi.fn(),
    };
    vi.mocked(getDatabasePool).mockResolvedValue({
      getConnection: vi.fn().mockResolvedValue(mockConnection),
    } as never);

    const res = await request(buildApp())
      .post('/auth/refresh')
      .send({ refreshToken: 'unknown-refresh-token' });

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid or expired refresh token');
    expect(mockConnection.execute).not.toHaveBeenCalled();
    expect(mockConnection.commit).not.toHaveBeenCalled();
  });

  it('возвращает 401, если сессия не активна', async () => {
    const plainRefresh = 'opaque-but-session-dead';
    const mockConnection = {
      beginTransaction: vi.fn().mockResolvedValue(undefined),
      commit: vi.fn().mockResolvedValue(undefined),
      rollback: vi.fn().mockResolvedValue(undefined),
      release: vi.fn(),
      query: vi
        .fn()
        .mockResolvedValueOnce([[ROTATION_ROW]])
        .mockResolvedValueOnce([[]]),
      execute: vi.fn(),
    };
    vi.mocked(getDatabasePool).mockResolvedValue({
      getConnection: vi.fn().mockResolvedValue(mockConnection),
    } as never);

    const res = await request(buildApp())
      .post('/auth/refresh')
      .send({ refreshToken: plainRefresh });

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid or expired refresh token');
    expect(mockConnection.execute).not.toHaveBeenCalled();
  });

  it('возвращает 400 без refreshToken', async () => {
    const res = await request(buildApp()).post('/auth/refresh').send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(vi.mocked(getDatabasePool)).not.toHaveBeenCalled();
  });
});
