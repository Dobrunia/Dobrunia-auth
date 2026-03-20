import { getDatabasePool } from '../../db/database';
import type { OAuthClient, OAuthClientCreateInput, OAuthClientUpdateInput } from '../../types/oauth-client.types';

export class OAuthClientsRepository {
  async findById(id: number): Promise<OAuthClient | null> {
    const pool = await getDatabasePool();
    const [rows] = await pool.query('SELECT * FROM oauth_clients WHERE id = ?', [id]);
    const clients = rows as OAuthClient[];
    return clients[0] || null;
  }

  async findByClientId(client_id: string): Promise<OAuthClient | null> {
    const pool = await getDatabasePool();
    const [rows] = await pool.query(
      'SELECT * FROM oauth_clients WHERE client_id = ?',
      [client_id]
    );
    const clients = rows as OAuthClient[];
    return clients[0] || null;
  }

  async findAll(): Promise<OAuthClient[]> {
    const pool = await getDatabasePool();
    const [rows] = await pool.query('SELECT * FROM oauth_clients ORDER BY created_at DESC');
    return rows as OAuthClient[];
  }

  async create(input: OAuthClientCreateInput): Promise<OAuthClient> {
    const pool = await getDatabasePool();
    const [result] = await pool.query(
      'INSERT INTO oauth_clients (client_id, client_secret_hash, name, redirect_uris, allowed_scopes, grant_types) VALUES (?, ?, ?, ?, ?, ?)',
      [
        input.client_id,
        input.client_secret_hash ?? null,
        input.name,
        JSON.stringify(input.redirect_uris),
        JSON.stringify(input.allowed_scopes),
        JSON.stringify(input.grant_types),
      ]
    );
    
    const insertId = (result as { insertId: number }).insertId;
    return this.findById(insertId) as Promise<OAuthClient>;
  }

  async update(id: number, input: OAuthClientUpdateInput): Promise<OAuthClient | null> {
    const pool = await getDatabasePool();
    const fields: string[] = [];
    const values: unknown[] = [];

    if (input.name !== undefined) {
      fields.push('name = ?');
      values.push(input.name);
    }
    if (input.redirect_uris !== undefined) {
      fields.push('redirect_uris = ?');
      values.push(JSON.stringify(input.redirect_uris));
    }
    if (input.allowed_scopes !== undefined) {
      fields.push('allowed_scopes = ?');
      values.push(JSON.stringify(input.allowed_scopes));
    }
    if (input.grant_types !== undefined) {
      fields.push('grant_types = ?');
      values.push(JSON.stringify(input.grant_types));
    }
    if (input.is_active !== undefined) {
      fields.push('is_active = ?');
      values.push(input.is_active);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    await pool.query(
      `UPDATE oauth_clients SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  async regenerateSecret(id: number, client_secret_hash: string): Promise<OAuthClient | null> {
    const pool = await getDatabasePool();
    await pool.query(
      'UPDATE oauth_clients SET client_secret_hash = ? WHERE id = ?',
      [client_secret_hash, id]
    );
    return this.findById(id);
  }

  async delete(id: number): Promise<void> {
    const pool = await getDatabasePool();
    await pool.query('DELETE FROM oauth_clients WHERE id = ?', [id]);
  }
}

export const oauthClientsRepository = new OAuthClientsRepository();
