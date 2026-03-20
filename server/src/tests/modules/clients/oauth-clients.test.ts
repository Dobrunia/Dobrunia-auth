import { describe, it, expect, beforeAll } from 'vitest';
import { getDatabasePool } from '../../../db/database';
import { oauthClientsService } from '../../../modules/clients/oauth-clients.service';

describe('OAuth Clients Admin API', () => {
  let pool: ReturnType<typeof getDatabasePool>;
  let testClientId: number;

  beforeAll(async () => {
    pool = await getDatabasePool();
  });

  it('should create oauth client with valid configuration', async () => {
    const result = await oauthClientsService.createClient({
      client_id: `test_client_${Date.now()}`,
      name: 'Test Client',
      redirect_uris: ['http://localhost:3000/callback'],
      allowed_scopes: ['openid', 'profile', 'email'],
      grant_types: ['authorization_code', 'refresh_token'],
      client_secret_hash: null,
    });

    expect(result.client.id).toBeDefined();
    expect(result.client.name).toBe('Test Client');
    expect(result.client_secret).toBeDefined(); // Secret returned only once

    testClientId = result.client.id;
  });

  it('should return oauth clients list', async () => {
    const clients = await oauthClientsService.getClients();
    
    expect(clients.length).toBeGreaterThan(0);
    expect(clients.some((c) => c.id === testClientId)).toBe(true);
  });

  it('should update oauth client configuration', async () => {
    const updated = await oauthClientsService.updateClient(testClientId, {
      name: 'Updated Client Name',
    });

    expect(updated).not.toBeNull();
    expect(updated?.name).toBe('Updated Client Name');
  });

  it('should regenerate oauth client secret', async () => {
    const result = await oauthClientsService.regenerateSecret(testClientId);

    expect(result).not.toBeNull();
    expect(result?.client_secret).toBeDefined();
    expect(result?.client_secret).toHaveLength(64); // 32 bytes hex = 64 chars
  });

  it('should delete oauth client', async () => {
    // Create a client to delete
    const clientToDelete = await oauthClientsService.createClient({
      client_id: `delete_client_${Date.now()}`,
      name: 'Client To Delete',
      redirect_uris: ['http://localhost:3000/callback'],
      allowed_scopes: ['openid'],
      grant_types: ['authorization_code'],
      client_secret_hash: null,
    });

    // Delete it
    await oauthClientsService.deleteClient(clientToDelete.client.id);

    // Verify it's deleted
    const clients = await oauthClientsService.getClients();
    expect(clients.some((c) => c.id === clientToDelete.client.id)).toBe(false);
  });
});
