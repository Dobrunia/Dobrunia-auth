import type {
  ManagedClientSession,
  RegisteredClient,
  RegisterClientBody,
  UpdateClientBody,
} from '@/types';
import { apiJson } from './http';

export async function listClients(): Promise<{ clients: RegisteredClient[] }> {
  return apiJson<{ clients: RegisteredClient[] }>('/clients', {
    method: 'GET',
    auth: true,
  });
}

export async function registerClient(
  body: RegisterClientBody
): Promise<{ client: RegisteredClient }> {
  return apiJson<{ client: RegisteredClient }>('/clients', {
    method: 'POST',
    body: JSON.stringify(body),
    auth: true,
  });
}

export async function updateClient(
  clientId: string,
  body: UpdateClientBody
): Promise<{ client: RegisteredClient }> {
  return apiJson<{ client: RegisteredClient }>(
    `/clients/${encodeURIComponent(clientId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(body),
      auth: true,
    }
  );
}

export async function deleteClient(clientId: string): Promise<void> {
  await apiJson(`/clients/${encodeURIComponent(clientId)}`, {
    method: 'DELETE',
    auth: true,
  });
}

export async function listManagedClientSessions(
  clientId: string
): Promise<{ sessions: ManagedClientSession[] }> {
  return apiJson<{ sessions: ManagedClientSession[] }>(
    `/clients/${encodeURIComponent(clientId)}/management/sessions`,
    {
      method: 'GET',
      auth: true,
    }
  );
}

export async function revokeManagedClientSession(
  clientId: string,
  sessionId: string
): Promise<void> {
  await apiJson(
    `/clients/${encodeURIComponent(clientId)}/management/sessions/${encodeURIComponent(sessionId)}`,
    {
      method: 'DELETE',
      auth: true,
    }
  );
}
