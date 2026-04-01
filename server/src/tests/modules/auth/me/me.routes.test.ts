import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../db/database', () => ({
  getDatabasePool: vi.fn(),
}));

import express from 'express';
import request from 'supertest';
import { getDatabasePool } from '../../../../db/database';
import { authRouter } from '../../../../modules/auth/auth.routes';
import { errorMiddleware } from '../../../../middleware/error.middleware';
import { signAccessToken } from '../../../../modules/auth/token.utils';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/auth', authRouter);
  app.use(errorMiddleware);
  return app;
}

const ME_ROW = {
  user_id: 'user-aaaa-aaaa-4aaa-aaaaaaaaaaaa',
  email: 'me@example.com',
  username: 'ann_doe',
  first_name: 'Ann',
  last_name: 'Doe',
  avatar_url: 'https://cdn.example.com/a.png',
  session_id: 'sess-bbbb-bbbb-4bbb-bbbbbbbbbbbb',
  client_id: '11111111-1111-4111-8111-111111111111',
  client_slug: 'dobrunia-auth-web',
  client_name: 'Dobrunia Auth Web',
};

describe('GET /auth/me', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('возвращает 200 и профиль при валидном Bearer access', async () => {
    const token = signAccessToken({
      sub: ME_ROW.user_id,
      sid: ME_ROW.session_id,
      email: ME_ROW.email,
    });

    const mockConnection = {
      release: vi.fn(),
      query: vi.fn().mockResolvedValueOnce([[ME_ROW]]),
    };
    vi.mocked(getDatabasePool).mockResolvedValue({
      getConnection: vi.fn().mockResolvedValue(mockConnection),
    } as never);

    const res = await request(buildApp()).get('/auth/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      user: {
        id: ME_ROW.user_id,
        email: ME_ROW.email,
        username: ME_ROW.username,
        firstName: ME_ROW.first_name,
        lastName: ME_ROW.last_name,
        avatarUrl: ME_ROW.avatar_url,
      },
      session: {
        id: ME_ROW.session_id,
        clientId: ME_ROW.client_id,
        clientSlug: ME_ROW.client_slug,
        clientName: ME_ROW.client_name,
      },
    });
  });

  it('возвращает 401 без Authorization', async () => {
    const res = await request(buildApp()).get('/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Authorization Bearer token required');
    expect(vi.mocked(getDatabasePool)).not.toHaveBeenCalled();
  });

  it('возвращает 401 при невалидном JWT', async () => {
    const res = await request(buildApp())
      .get('/auth/me')
      .set('Authorization', 'Bearer not-a-jwt');

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid or expired access token');
    expect(vi.mocked(getDatabasePool)).not.toHaveBeenCalled();
  });

  it('возвращает 401, если сессия не найдена или не активна', async () => {
    const token = signAccessToken({
      sub: ME_ROW.user_id,
      sid: ME_ROW.session_id,
      email: ME_ROW.email,
    });

    const mockConnection = {
      release: vi.fn(),
      query: vi.fn().mockResolvedValueOnce([[]]),
    };
    vi.mocked(getDatabasePool).mockResolvedValue({
      getConnection: vi.fn().mockResolvedValue(mockConnection),
    } as never);

    const res = await request(buildApp()).get('/auth/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid or expired access token');
  });
});
