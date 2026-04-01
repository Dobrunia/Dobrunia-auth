import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../db/database', () => ({
  getDatabasePool: vi.fn(),
}));

import express from 'express';
import request from 'supertest';
import { getDatabasePool } from '../../../../db/database';
import { authRouter } from '../../../../modules/auth/auth.routes';
import { errorMiddleware } from '../../../../middleware/error.middleware';
import { hashPassword } from '../../../../utils/password';

const DEV_CLIENT_ROW = {
  id: '11111111-1111-4111-8111-111111111111',
  slug: 'dobrunia-auth-web',
  name: 'Dobrunia Auth Web',
};

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/auth', authRouter);
  app.use(errorMiddleware);
  return app;
}

describe('POST /auth/login', () => {
  let validPasswordHash: string;

  beforeAll(async () => {
    validPasswordHash = await hashPassword('12345678');
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  /** Проверяет успешный вход: 200, новая сессия и токены (БД замокана). */
  it('возвращает 200 и токены при верных учётных данных', async () => {
    const mockConnection = {
      beginTransaction: vi.fn().mockResolvedValue(undefined),
      commit: vi.fn().mockResolvedValue(undefined),
      rollback: vi.fn().mockResolvedValue(undefined),
      release: vi.fn(),
      query: vi
        .fn()
        .mockResolvedValueOnce([[DEV_CLIENT_ROW]])
        .mockResolvedValueOnce([
          [
            {
              id: 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee',
              email: 'user@example.com',
              password_hash: validPasswordHash,
              is_active: 1,
            },
          ],
        ]),
      execute: vi.fn().mockResolvedValue([{ affectedRows: 1 }, []]),
    };
    vi.mocked(getDatabasePool).mockResolvedValue({
      getConnection: vi.fn().mockResolvedValue(mockConnection),
    } as never);

    const res = await request(buildApp())
      .post('/auth/login')
      .send({
        email: 'user@example.com',
        password: '12345678',
        clientId: 'dobrunia-auth-web',
      });

    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({
      id: 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee',
      email: 'user@example.com',
    });
    expect(res.body.session.clientId).toBe(DEV_CLIENT_ROW.id);
    expect(res.body.session.clientSlug).toBe('dobrunia-auth-web');
    expect(typeof res.body.accessToken).toBe('string');
    expect(typeof res.body.refreshToken).toBe('string');
    expect(mockConnection.execute).toHaveBeenCalledTimes(3);
  });

  /** Проверяет 401 при неверном пароле (единое сообщение, без утечки деталей). */
  it('возвращает 401 при неверном пароле', async () => {
    const mockConnection = {
      beginTransaction: vi.fn().mockResolvedValue(undefined),
      commit: vi.fn().mockResolvedValue(undefined),
      rollback: vi.fn().mockResolvedValue(undefined),
      release: vi.fn(),
      query: vi
        .fn()
        .mockResolvedValueOnce([[DEV_CLIENT_ROW]])
        .mockResolvedValueOnce([
          [
            {
              id: 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee',
              email: 'user@example.com',
              password_hash: validPasswordHash,
              is_active: 1,
            },
          ],
        ]),
      execute: vi.fn(),
    };
    vi.mocked(getDatabasePool).mockResolvedValue({
      getConnection: vi.fn().mockResolvedValue(mockConnection),
    } as never);

    const res = await request(buildApp())
      .post('/auth/login')
      .send({
        email: 'user@example.com',
        password: 'wrong-password-xxx',
        clientId: 'dobrunia-auth-web',
      });

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid email or password');
    expect(mockConnection.commit).not.toHaveBeenCalled();
  });

  /** Проверяет 401, если пользователя с таким email нет. */
  it('возвращает 401, если пользователь не найден', async () => {
    const mockConnection = {
      beginTransaction: vi.fn().mockResolvedValue(undefined),
      commit: vi.fn().mockResolvedValue(undefined),
      rollback: vi.fn().mockResolvedValue(undefined),
      release: vi.fn(),
      query: vi.fn().mockResolvedValueOnce([[DEV_CLIENT_ROW]]).mockResolvedValueOnce([[]]),
      execute: vi.fn(),
    };
    vi.mocked(getDatabasePool).mockResolvedValue({
      getConnection: vi.fn().mockResolvedValue(mockConnection),
    } as never);

    const res = await request(buildApp())
      .post('/auth/login')
      .send({
        email: 'ghost@example.com',
        password: '12345678',
        clientId: 'dobrunia-auth-web',
      });

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid email or password');
  });

  /** Проверяет 401 для неактивного аккаунта. */
  it('возвращает 401, если аккаунт деактивирован', async () => {
    const mockConnection = {
      beginTransaction: vi.fn().mockResolvedValue(undefined),
      commit: vi.fn().mockResolvedValue(undefined),
      rollback: vi.fn().mockResolvedValue(undefined),
      release: vi.fn(),
      query: vi
        .fn()
        .mockResolvedValueOnce([[DEV_CLIENT_ROW]])
        .mockResolvedValueOnce([
          [
            {
              id: 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee',
              email: 'user@example.com',
              password_hash: validPasswordHash,
              is_active: 0,
            },
          ],
        ]),
      execute: vi.fn(),
    };
    vi.mocked(getDatabasePool).mockResolvedValue({
      getConnection: vi.fn().mockResolvedValue(mockConnection),
    } as never);

    const res = await request(buildApp())
      .post('/auth/login')
      .send({
        email: 'user@example.com',
        password: '12345678',
        clientId: 'dobrunia-auth-web',
      });

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid email or password');
  });

  /** Проверяет 401, если у пользователя нет password_hash (например, только OAuth). */
  it('возвращает 401, если пароль не задан в БД', async () => {
    const mockConnection = {
      beginTransaction: vi.fn().mockResolvedValue(undefined),
      commit: vi.fn().mockResolvedValue(undefined),
      rollback: vi.fn().mockResolvedValue(undefined),
      release: vi.fn(),
      query: vi
        .fn()
        .mockResolvedValueOnce([[DEV_CLIENT_ROW]])
        .mockResolvedValueOnce([
          [
            {
              id: 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee',
              email: 'oauth@example.com',
              password_hash: null,
              is_active: 1,
            },
          ],
        ]),
      execute: vi.fn(),
    };
    vi.mocked(getDatabasePool).mockResolvedValue({
      getConnection: vi.fn().mockResolvedValue(mockConnection),
    } as never);

    const res = await request(buildApp())
      .post('/auth/login')
      .send({
        email: 'oauth@example.com',
        password: '12345678',
        clientId: 'dobrunia-auth-web',
      });

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid email or password');
  });

  /** Проверяет 401 при неизвестном или неактивном клиенте. */
  it('возвращает 401, если клиент не найден', async () => {
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
      .post('/auth/login')
      .send({
        email: 'user@example.com',
        password: '12345678',
        clientId: 'unknown-client',
      });

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid email or password');
  });

  /** Проверяет 400 при невалидном теле (как у регистрации). */
  it('возвращает 400 при невалидном теле и не обращается к БД', async () => {
    const res = await request(buildApp())
      .post('/auth/login')
      .send({ email: 'bad', password: '12345678', clientId: 'dobrunia-auth-web' });

    expect(res.status).toBe(400);
    expect(vi.mocked(getDatabasePool)).not.toHaveBeenCalled();
  });
});
