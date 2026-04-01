import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../db/database', () => ({
  getDatabasePool: vi.fn(),
}));

import express from 'express';
import request from 'supertest';
import { getDatabasePool } from '../../../../db/database';
import { authRouter } from '../../../../modules/auth/auth.routes';
import { errorMiddleware } from '../../../../middleware/error.middleware';
import { registerBodySchema } from '../../../../utils/schemas/register.schema';

const DEV_CLIENT_ROW = {
  id: '11111111-1111-4111-8111-111111111111',
  slug: 'shop-web',
  name: 'Shop Web',
};

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/auth', authRouter);
  app.use(errorMiddleware);
  return app;
}

function setupDbMocksForSuccessfulRegister() {
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
  return mockConnection;
}

function setupDbMocksForExistingUser() {
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
  return mockConnection;
}

describe('registerBodySchema', () => {
  /** Проверяет, что корректное тело с clientId (slug) успешно проходит валидацию и email нормализуется. */
  it('принимает валидные email, пароль и clientId', () => {
    const out = registerBodySchema.parse({
      email: '  Test@Example.COM ',
      password: '12345678',
      clientId: 'shop-web',
    });
    expect(out.email).toBe('test@example.com');
    expect(out.password).toBe('12345678');
    expect(out.clientId).toBe('shop-web');
  });

  /** Проверяет, что вместо clientId можно передать только clientSlug. */
  it('принимает clientSlug вместо clientId', () => {
    const out = registerBodySchema.parse({
      email: 'a@b.co',
      password: '12345678',
      clientSlug: 'shop-web',
    });
    expect(out.clientSlug).toBe('shop-web');
  });

  /** Проверяет, что без clientId и без clientSlug схема отклоняет запрос. */
  it('отклоняет запрос, если нет ни clientId, ни clientSlug', () => {
    expect(() =>
      registerBodySchema.parse({
        email: 'a@b.co',
        password: '12345678',
      })
    ).toThrow();
  });

  /** Проверяет, что пароль короче 8 символов не принимается. */
  it('отклоняет слишком короткий пароль', () => {
    expect(() =>
      registerBodySchema.parse({
        email: 'a@b.co',
        password: 'short',
        clientId: 'x',
      })
    ).toThrow();
  });

  /** Проверяет, что строка без формата email отклоняется после trim. */
  it('отклоняет невалидный email', () => {
    expect(() =>
      registerBodySchema.parse({
        email: 'not-an-email',
        password: '12345678',
        clientId: 'shop-web',
      })
    ).toThrow();
  });

  /** Проверяет, что пустой clientId не считается заданным клиентом (min length / отсутствие пары). */
  it('отклоняет пустой clientId без clientSlug', () => {
    expect(() =>
      registerBodySchema.parse({
        email: 'a@b.co',
        password: '12345678',
        clientId: '',
      })
    ).toThrow();
  });
});

describe('POST /auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /** Проверяет успешный сценарий: 201, пользователь, сессия, access и refresh токены (БД замокана). */
  it('возвращает 201 и данные автологина при валидном теле и свободном email', async () => {
    setupDbMocksForSuccessfulRegister();

    const res = await request(buildApp())
      .post('/auth/register')
      .send({
        email: 'newuser@example.com',
        password: '12345678',
        clientId: 'shop-web',
      });

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({
      email: 'newuser@example.com',
    });
    expect(res.body.user.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
    expect(res.body.session).toMatchObject({
      clientId: DEV_CLIENT_ROW.id,
      clientSlug: 'shop-web',
    });
    expect(res.body.session.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
    expect(typeof res.body.accessToken).toBe('string');
    expect(res.body.accessToken.length).toBeGreaterThan(20);
    expect(typeof res.body.refreshToken).toBe('string');
    expect(res.body.refreshToken.length).toBeGreaterThan(20);
  });

  /** Проверяет, что при невалидном email, пароле или отсутствии клиента возвращается 400 и тело error. */
  it.each([
    {
      label: 'невалидный email',
      body: { email: 'not-email', password: '12345678', clientId: 'shop-web' },
    },
    {
      label: 'пароль короче 8 символов',
      body: { email: 'ok@example.com', password: 'short', clientId: 'shop-web' },
    },
    {
      label: 'нет ни clientId, ни clientSlug',
      body: { email: 'ok@example.com', password: '12345678' },
    },
    {
      label: 'пустой clientId без clientSlug',
      body: { email: 'ok@example.com', password: '12345678', clientId: '' },
    },
  ])('возвращает 400 при: $label', async ({ body }) => {
    const res = await request(buildApp()).post('/auth/register').send(body);

    expect(res.status).toBe(400);
    expect(res.body).toEqual(
      expect.objectContaining({
        error: expect.objectContaining({ message: expect.any(String) }),
      })
    );
    expect(vi.mocked(getDatabasePool)).not.toHaveBeenCalled();
  });

  /** Проверяет, что если пользователь с таким email уже есть, возвращается 409 и сообщение о занятом email. */
  it('возвращает 409, если email уже зарегистрирован', async () => {
    const conn = setupDbMocksForExistingUser();

    const res = await request(buildApp())
      .post('/auth/register')
      .send({
        email: 'taken@example.com',
        password: '12345678',
        clientId: 'shop-web',
      });

    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe('Email already registered');
    expect(conn.rollback).toHaveBeenCalled();
    expect(conn.commit).not.toHaveBeenCalled();
    expect(conn.execute).not.toHaveBeenCalled();
  });
});
