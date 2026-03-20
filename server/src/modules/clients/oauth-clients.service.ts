import { oauthClientsRepository } from '../oauth/oauth-clients.repository';
import { hashPassword } from '../../shared/password.utils';
import type { OAuthClient, OAuthClientCreateInput, OAuthClientUpdateInput } from '../../types/oauth-client.types';
import * as crypto from 'crypto';

export class OAuthClientsService {
  async createClient(input: OAuthClientCreateInput): Promise<{ client: OAuthClient; client_secret?: string }> {
    // Generate client secret if not provided (for confidential clients)
    let client_secret: string | undefined;
    let client_secret_hash: string | null = null;

    if (input.client_secret_hash === undefined || input.client_secret_hash === null) {
      client_secret = crypto.randomBytes(32).toString('hex');
      client_secret_hash = await hashPassword(client_secret);
    } else {
      client_secret_hash = input.client_secret_hash;
    }

    // Create client
    const client = await oauthClientsRepository.create({
      ...input,
      client_secret_hash,
    });

    return {
      client,
      client_secret, // Return only once, never stored
    };
  }

  async getClients(): Promise<OAuthClient[]> {
    return oauthClientsRepository.findAll();
  }

  async getClientById(id: number): Promise<OAuthClient | null> {
    return oauthClientsRepository.findById(id);
  }

  async updateClient(id: number, input: OAuthClientUpdateInput): Promise<OAuthClient | null> {
    return oauthClientsRepository.update(id, input);
  }

  async regenerateSecret(id: number): Promise<{ client_secret: string; client: OAuthClient } | null> {
    // Generate new secret
    const newSecret = crypto.randomBytes(32).toString('hex');
    const newSecretHash = await hashPassword(newSecret);

    // Update in database
    const client = await oauthClientsRepository.regenerateSecret(id, newSecretHash);

    if (!client) {
      return null;
    }

    return {
      client_secret: newSecret,
      client,
    };
  }

  async deleteClient(id: number): Promise<void> {
    return oauthClientsRepository.delete(id);
  }
}

export const oauthClientsService = new OAuthClientsService();
