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
  slug: 'dobrunia-auth-web',
  name: 'Dobrunia Auth Web',
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
          clientId: 'dobrunia-auth-web',
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
          clientId: 'dobrunia-auth-web',
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
          clientId: 'dobrunia-auth-web',
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
          clientId: 'dobrunia-auth-web',
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
          clientId: 'dobrunia-auth-web',
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
          clientId: 'dobrunia-auth-web',
        });

      expect(res.status).toBe(401);
      assertHttpErrorShape(res.body);
      expect(res.body.error.message).toBe('Invalid email or password');
      expect(JSON.stringify(res.body)).not.toContain(triedPassword);
    });
  });

  describe('POST /auth/logout', () => {
    /** 204: пустое тело, refresh из запроса не попадает в ответ. */
    it('не возвращает тело и не эхоит refreshToken при неизвестном токене', async () => {
      const secretRefresh = 'LogoutUnknownRt_ShouldNotEcho_6hJ';
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
        .send({ refreshToken: secretRefresh });

      expect(res.status).toBe(204);
      expect(res.text).toBe('');
      const out = res.body && Object.keys(res.body).length ? JSON.stringify(res.body) : '';
      expect(out).not.toContain(secretRefresh);
    });

    /** 400: только error.message. */
    it('не раскрывает лишние поля при невалидном теле logout', async () => {
      const res = await request(buildApp()).post('/auth/logout').send({});

      expect(res.status).toBe(400);
      assertHttpErrorShape(res.body);
      assertBodyHasNoSensitiveLeak(res.body);
    });
  });

  describe('POST /auth/refresh', () => {
    it('успех: только accessToken и refreshToken, без лишних полей', async () => {
      const { hashRefreshToken } = await import('../../../modules/auth/token.utils');
      const plainRefresh = 'SafetyRefreshOk_OnlyTokensInBody_9kM';
      const tokenHash = hashRefreshToken(plainRefresh);
      const mockConnection = {
        beginTransaction: vi.fn().mockResolvedValue(undefined),
        commit: vi.fn().mockResolvedValue(undefined),
        rollback: vi.fn().mockResolvedValue(undefined),
        release: vi.fn(),
        query: vi
          .fn()
          .mockResolvedValueOnce([
            [
              {
                id: 'rt-safety-1111-4111-8111-111111111111',
                session_id: 'sess-safety-2222-4222-8222-222222222222',
                user_id: 'user-safety-3333-4333-8333-333333333333',
                family_id: null,
                email: 'refresh-safe@example.com',
              },
            ],
          ])
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
      expect(Object.keys(res.body).sort()).toEqual(['accessToken', 'refreshToken'].sort());
      assertBodyHasNoSensitiveLeak(res.body);
      expect(JSON.stringify(res.body)).not.toContain(tokenHash);
    });

    it('401: одно сообщение, без деталей причины', async () => {
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
        .send({ refreshToken: 'bad-refresh-safety-test' });

      expect(res.status).toBe(401);
      assertHttpErrorShape(res.body);
      expect(res.body.error.message).toBe('Invalid or expired refresh token');
      assertBodyHasNoSensitiveLeak(res.body);
    });
  });

  describe('GET /auth/me', () => {
    it('успех: только user и session с ожидаемыми ключами, без пароля и хешей', async () => {
      const { signAccessToken } = await import('../../../modules/auth/token.utils');
      const token = signAccessToken({
        sub: 'user-me-safe-aaaa-4aaa-aaaaaaaaaaaa',
        sid: 'sess-me-safe-bbbb-4bbb-bbbbbbbbbbbb',
        email: 'me-safe@example.com',
      });
      const mockConnection = {
        release: vi.fn(),
        query: vi.fn().mockResolvedValueOnce([
          [
            {
              user_id: 'user-me-safe-aaaa-4aaa-aaaaaaaaaaaa',
              email: 'me-safe@example.com',
              username: null,
              first_name: 'Safe',
              last_name: 'User',
              avatar_url: null,
              session_id: 'sess-me-safe-bbbb-4bbb-bbbbbbbbbbbb',
              client_id: '11111111-1111-4111-8111-111111111111',
              client_slug: 'dobrunia-auth-web',
              client_name: 'Dobrunia Auth Web',
            },
          ],
        ]),
      };
      vi.mocked(getDatabasePool).mockResolvedValue({
        getConnection: vi.fn().mockResolvedValue(mockConnection),
      } as never);

      const res = await request(buildApp()).get('/auth/me').set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Object.keys(res.body).sort()).toEqual(['session', 'user'].sort());
      expect(Object.keys(res.body.user as object).sort()).toEqual(
        ['avatarUrl', 'email', 'firstName', 'id', 'lastName', 'username'].sort()
      );
      expect(Object.keys(res.body.session as object).sort()).toEqual(
        ['clientId', 'clientName', 'clientSlug', 'id'].sort()
      );
      assertBodyHasNoSensitiveLeak(res.body);
    });
  });
});
