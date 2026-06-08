import type { RegisteredClient, RegisterClientBody } from '@/types';
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
