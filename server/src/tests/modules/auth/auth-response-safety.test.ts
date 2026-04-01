import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../db/database', () => ({
  getDatabasePool: vi.fn(),
}));

import express from 'express';
import request from 'supertest';
import { getDatabasePool } from '../../../db/database';
import { authRouter } from '../../../modules/auth/auth.routes';
import { errorMiddleware } from '../../../middleware/error.middleware';
import { hashPassword } from '../../../utils/password';

const DEV_CLIENT_ROW = {
  id: '11111111-1111-4111-8111-111111111111',
  slug: 'shop-web',
  name: 'Shop Web',
};

/** Паттерны, которых не должно быть в JSON ответа клиенту */
const SENSITIVE_PATTERNS =
  /password_hash|argon2|\$argon|mysql|ER_[A-Z_]+|sqlstate|stack|trace|sequelize|prisma|at\s+\w+\.|insert\s+into|select\s+\*/i;

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/auth', authRouter);
  app.use(errorMiddleware);
  return app;
}

/** Успешный ответ register/login: только ожидаемые поля, без секретов. */
function assertAuthSuccessShape(body: Record<string, unknown>): void {
  expect(Object.keys(body).sort()).toEqual(
    ['accessToken', 'refreshToken', 'session', 'user'].sort()
  );
  expect(body.user).toEqual(
    expect.objectContaining({
      id: expect.any(String),
      email: expect.any(String),
    })
  );
  expect(Object.keys(body.user as object).sort()).toEqual(['email', 'id'].sort());
  expect(body.session).toEqual(
    expect.objectContaining({
      id: expect.any(String),
      clientId: expect.any(String),
      clientSlug: expect.any(String),
    })
  );
  expect(Object.keys(body.session as object).sort()).toEqual(
    ['clientId', 'clientSlug', 'id'].sort()
  );
  expect(typeof body.accessToken).toBe('string');
  expect(typeof body.refreshToken).toBe('string');
}

/** Ошибка от HttpError: только error.message, без стека и вложенных деталей. */
function assertHttpErrorShape(body: Record<string, unknown>): void {
  expect(Object.keys(body)).toEqual(['error']);
  expect(body.error).toEqual(expect.objectContaining({ message: expect.any(String) }));
  expect(Object.keys(body.error as object)).toEqual(['message']);
}

function assertBodyHasNoSensitiveLeak(body: unknown): void {
  const raw = JSON.stringify(body);
  expect(raw).not.toMatch(SENSITIVE_PATTERNS);
}

describe('Безопасность и контракт тел ответов /auth', () => {
  let validPasswordHash: string;

  beforeAll(async () => {
    validPasswordHash = await hashPassword('12345678');
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /auth/register', () => {
    /** Успех: строгий набор полей, пароль из запроса не попадает в ответ, нет внутренних строк. */
    it('не утекает пароль и лишние поля при успешной регистрации', async () => {
      const secretPassword = 'UniqueRegisterPw_NeverInResponse_9zK';
      const mockConnection = {
        beginTransaction: vi.fn().mockResolvedValue(undefined),
        commit: vi.fn().mockResolvedValue(undefined),
        rollback: vi.fn().mockResolvedValue(undefined),
        release: vi.fn(),
        query: vi
          .fn()
          .mockResolvedValueOnce([[DEV_CLIENT_ROW]])
          .mockResolvedValueOnce([[]]),
        execute: vi.fn().mockResolvedValue([{ affectedRows: 1 }, []]),
      };
      vi.mocked(getDatabasePool).mockResolvedValue({
        getConnection: vi.fn().mockResolvedValue(mockConnection),
      } as never);

      const res = await request(buildApp())
        .post('/auth/register')
        .send({
          email: 'safe-user@example.com',
          password: secretPassword,
          clientId: 'shop-web',
        });

      expect(res.status).toBe(201);
      assertAuthSuccessShape(res.body);
      assertBodyHasNoSensitiveLeak(res.body);
      expect(JSON.stringify(res.body)).not.toContain(secretPassword);
    });

    /** Ошибка 409: только сообщение, без лишних полей и технических деталей. */
    it('не раскрывает внутренности при конфликте email', async () => {
      const mockConnection = {
        beginTransaction: vi.fn().mockResolvedValue(undefined),
        commit: vi.fn().mockResolvedValue(undefined),
        rollback: vi.fn().mockResolvedValue(undefined),
        release: vi.fn(),
        query: vi
          .fn()
          .mockResolvedValueOnce([[DEV_CLIENT_ROW]])
          .mockResolvedValueOnce([[{ id: 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee' }]]),
        execute: vi.fn(),
      };
      vi.mocked(getDatabasePool).mockResolvedValue({
        getConnection: vi.fn().mockResolvedValue(mockConnection),
      } as never);

      const leakPassword = 'ConflictAttemptPw_ShouldNotEcho_7qW';
      const res = await request(buildApp())
        .post('/auth/register')
        .send({
          email: 'taken@example.com',
          password: leakPassword,
          clientId: 'shop-web',
        });

      expect(res.status).toBe(409);
      assertHttpErrorShape(res.body);
      assertBodyHasNoSensitiveLeak(res.body);
      expect(JSON.stringify(res.body)).not.toContain(leakPassword);
      expect(res.body.error.message).toBe('Email already registered');
    });

    /** Ошибка 400: пароль из тела не отражается в ответе. */
    it('не возвращает пароль и лишние поля при ошибке валидации', async () => {
      const secretPassword = 'ValidationFailPw_NotInBody_4mN';
      const res = await request(buildApp())
        .post('/auth/register')
        .send({
          email: 'not-an-email',
          password: secretPassword,
          clientId: 'shop-web',
        });

      expect(res.status).toBe(400);
      assertHttpErrorShape(res.body);
      assertBodyHasNoSensitiveLeak(res.body);
      expect(JSON.stringify(res.body)).not.toContain(secretPassword);
    });
  });

  describe('POST /auth/login', () => {
    /** Успех: тот же контракт, что у регистрации; пароль не в ответе. */
    it('не утекает пароль и лишние поля при успешном входе', async () => {
      const secretPassword = 'UniqueLoginOkPw_NotInResponse_2pL';
      const hash = await hashPassword(secretPassword);
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
                id: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
                email: 'login-safe@example.com',
                password_hash: hash,
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
          email: 'login-safe@example.com',
          password: secretPassword,
          clientId: 'shop-web',
        });

      expect(res.status).toBe(200);
      assertAuthSuccessShape(res.body);
      assertBodyHasNoSensitiveLeak(res.body);
      expect(JSON.stringify(res.body)).not.toContain(secretPassword);
      expect(JSON.stringify(res.body)).not.toContain(hash);
    });

    /** 401: одно сообщение, без различия «нет юзера» / «неверный пароль» в структуре ответа. */
    it('не раскрывает детали при неверном пароле', async () => {
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
                id: 'cccccccc-cccc-4ccc-cccc-cccccccccccc',
                email: 'u@example.com',
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

      const triedPassword = 'WrongPw_ShouldNeverAppear_8sD';
      const res = await request(buildApp())
        .post('/auth/login')
        .send({
          email: 'u@example.com',
          password: triedPassword,
          clientId: 'shop-web',
        });

      expect(res.status).toBe(401);
      assertHttpErrorShape(res.body);
      assertBodyHasNoSensitiveLeak(res.body);
      expect(JSON.stringify(res.body)).not.toContain(triedPassword);
      expect(res.body.error.message).toBe('Invalid email or password');
    });

    /** 401 при отсутствии пользователя: тот же контракт ответа, без подсказок. */
    it('не раскрывает детали при отсутствии пользователя', async () => {
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

      const triedPassword = 'GhostUserPw_NotInResponse_1vX';
      const res = await request(buildApp())
        .post('/auth/login')
        .send({
          email: 'nobody@example.com',
          password: triedPassword,
          clientId: 'shop-web',
        });

      expect(res.status).toBe(401);
      assertHttpErrorShape(res.body);
      expect(res.body.error.message).toBe('Invalid email or password');
      expect(JSON.stringify(res.body)).not.toContain(triedPassword);
    });
  });
});
