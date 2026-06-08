import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/api/http', () => ({
  apiJson: vi.fn(),
}));

import {
  deleteClient,
  listClients,
  listManagedClientSessions,
  registerClient,
  revokeManagedClientSession,
  updateClient,
} from '@/api/clients-api';
import { apiJson } from '@/api/http';

describe('clients-api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiJson).mockResolvedValue(undefined);
  });

  it('получает приложения только через авторизованный запрос', async () => {
    await listClients();

    expect(apiJson).toHaveBeenCalledWith('/clients', {
      method: 'GET',
      auth: true,
    });
  });

  it('регистрирует приложение с переданным телом', async () => {
    const body = {
      name: 'Test App',
      slug: 'test-app',
      redirectUris: ['https://app.example/callback'],
    };

    await registerClient(body);

    expect(apiJson).toHaveBeenCalledWith('/clients', {
      method: 'POST',
      body: JSON.stringify(body),
      auth: true,
    });
  });

  it('обновляет приложение и безопасно кодирует client id', async () => {
    const body = { name: 'Updated App', isActive: false };

    await updateClient('client/id', body);

    expect(apiJson).toHaveBeenCalledWith('/clients/client%2Fid', {
      method: 'PATCH',
      body: JSON.stringify(body),
      auth: true,
    });
  });

  it('удаляет приложение авторизованным запросом', async () => {
    await deleteClient('client/id');

    expect(apiJson).toHaveBeenCalledWith('/clients/client%2Fid', {
      method: 'DELETE',
      auth: true,
    });
  });

  it('запрашивает управляемые сессии приложения', async () => {
    await listManagedClientSessions('client/id');

    expect(apiJson).toHaveBeenCalledWith(
      '/clients/client%2Fid/management/sessions',
      {
        method: 'GET',
        auth: true,
      }
    );
  });

  it('отзывает конкретную сессию и кодирует оба идентификатора', async () => {
    await revokeManagedClientSession('client/id', 'session/id');

    expect(apiJson).toHaveBeenCalledWith(
      '/clients/client%2Fid/management/sessions/session%2Fid',
      {
        method: 'DELETE',
        auth: true,
      }
    );
  });
});
