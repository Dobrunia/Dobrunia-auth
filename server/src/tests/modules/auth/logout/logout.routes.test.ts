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

describe('POST /auth/logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /** Успех: отзыв refresh и сессии, пустое тело 204. */
  it('возвращает 204 и отзывает токен при валидном refreshToken', async () => {
    const plainRefresh = 'opaque-refresh-test-token-abc';
    const tokenHash = hashRefreshToken(plainRefresh);

    const mockConnection = {
      beginTransaction: vi.fn().mockResolvedValue(undefined),
      commit: vi.fn().mockResolvedValue(undefined),
      rollback: vi.fn().mockResolvedValue(undefined),
      release: vi.fn(),
      query: vi.fn().mockResolvedValueOnce([[{ id: 'rt-uuid-1111', session_id: 'sess-uuid-2222' }]]),
      execute: vi.fn().mockResolvedValue([{ affectedRows: 1 }, []]),
    };
    vi.mocked(getDatabasePool).mockResolvedValue({
      getConnection: vi.fn().mockResolvedValue(mockConnection),
    } as never);

    const res = await request(buildApp())
      .post('/auth/logout')
      .send({ refreshToken: plainRefresh });

    expect(res.status).toBe(204);
    expect(res.text).toBe('');
    expect(mockConnection.query).toHaveBeenCalledWith(
      expect.stringContaining('token_hash'),
      [tokenHash]
    );
    expect(mockConnection.execute).toHaveBeenCalledTimes(2);
    expect(mockConnection.commit).toHaveBeenCalled();
  });

  /** Неизвестный / просроченный токен — тоже 204 (идемпотентность). */
  it('возвращает 204, если refresh не найден', async () => {
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
      .post('/auth/logout')
      .send({ refreshToken: 'totally-unknown-token' });

    expect(res.status).toBe(204);
    expect(res.text).toBe('');
    expect(mockConnection.execute).not.toHaveBeenCalled();
  });

  /** Невалидное тело — 400. */
  it('возвращает 400 без refreshToken', async () => {
    const res = await request(buildApp()).post('/auth/logout').send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(vi.mocked(getDatabasePool)).not.toHaveBeenCalled();
  });
});
