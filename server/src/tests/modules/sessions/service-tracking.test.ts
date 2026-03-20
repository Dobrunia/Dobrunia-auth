import { describe, it, expect, beforeAll } from 'vitest';
import { getDatabasePool } from '../../../db/database';
import { hashPassword } from '../../../shared/password.utils';
import { sessionsRepository } from '../../../modules/sessions/sessions.repository';

describe('Sessions Repository - Service Tracking', () => {
  let pool: ReturnType<typeof getDatabasePool>;
  let testUserId: number;
  let testClientId: number;

  beforeAll(async () => {
    pool = await getDatabasePool();

    // Create test user
    const testEmail = `session_track_${Date.now()}@example.com`;
    const testPassword = 'TestPass123';
    const passwordHash = await hashPassword(testPassword);

    const [userResult] = await pool.query(
      'INSERT INTO users (email, password_hash, status) VALUES (?, ?, ?)',
      [testEmail, passwordHash, 'active']
    );
    testUserId = (userResult as { insertId: number }).insertId;

    // Create test OAuth client
    const [clientResult] = await pool.query(
      'INSERT INTO oauth_clients (client_id, name, redirect_uris, allowed_scopes, grant_types) VALUES (?, ?, ?, ?, ?)',
      [`track_client_${Date.now()}`, 'Test Tracking Client', '["http://localhost:3000/callback"]', '["openid"]', '["authorization_code"]']
    );
    testClientId = (clientResult as { insertId: number }).insertId;
  });

  it('should create session with client_id and service_name', async () => {
    const session = await sessionsRepository.create({
      user_id: testUserId,
      client_id: testClientId,
      service_name: 'Test Service',
      user_agent: 'Test Browser',
      ip_address: '127.0.0.1',
    });

    expect(session).toBeDefined();
    expect(session.client_id).toBe(testClientId);
    expect(session.service_name).toBe('Test Service');
  });

  it('should create session without client_id (direct login)', async () => {
    const session = await sessionsRepository.create({
      user_id: testUserId,
      client_id: null,
      service_name: null,
      user_agent: 'Test Browser',
      ip_address: '127.0.0.1',
    });

    expect(session).toBeDefined();
    expect(session.client_id).toBeNull();
    expect(session.service_name).toBeNull();
  });

  it('should find sessions grouped by client', async () => {
    // Create a new client for this test to avoid interference
    const [clientResult] = await pool.query(
      'INSERT INTO oauth_clients (client_id, name, redirect_uris, allowed_scopes, grant_types) VALUES (?, ?, ?, ?, ?)',
      [`track_client2_${Date.now()}`, 'Test Tracking Client 2', '["http://localhost:3000/callback"]', '["openid"]', '["authorization_code"]']
    );
    const newClientId = (clientResult as { insertId: number }).insertId;
    
    const serviceName = `Service A ${Date.now()}`;
    
    await sessionsRepository.create({
      user_id: testUserId,
      client_id: newClientId,
      service_name: serviceName,
    });

    await sessionsRepository.create({
      user_id: testUserId,
      client_id: newClientId,
      service_name: serviceName,
    });

    const grouped = await sessionsRepository.findByUserIdGroupedByClient(testUserId);

    expect(grouped).toBeDefined();
    expect(grouped.length).toBeGreaterThan(0);

    // Find the group for our new client
    const clientGroup = grouped.find(g => g.client_id === newClientId);
    expect(clientGroup).toBeDefined();
    expect(clientGroup?.service_name).toBe(serviceName);
    expect(clientGroup?.session_count).toBe(2);
  });

  it('should revoke all sessions for a specific client', async () => {
    // Create sessions
    const session1 = await sessionsRepository.create({
      user_id: testUserId,
      client_id: testClientId,
      service_name: 'Service To Revoke',
    });

    await sessionsRepository.revokeAllForClient(testUserId, testClientId);

    // Verify sessions are revoked
    const allSessions = await sessionsRepository.findAllByUserId(testUserId);
    const clientSessions = allSessions.filter(s => s.client_id === testClientId);

    clientSessions.forEach(session => {
      expect(session.revoked_at).toBeDefined();
    });
  });

  it('should handle sessions with mixed client_id values', async () => {
    // Create sessions with and without client_id
    await sessionsRepository.create({
      user_id: testUserId,
      client_id: null,
      service_name: null,
    });

    await sessionsRepository.create({
      user_id: testUserId,
      client_id: testClientId,
      service_name: 'Named Service',
    });

    const grouped = await sessionsRepository.findByUserIdGroupedByClient(testUserId);

    // Should have at least 2 groups (direct + client)
    const directGroup = grouped.find(g => g.client_id === 'direct');
    const clientGroup = grouped.find(g => g.client_id === testClientId);

    expect(directGroup).toBeDefined();
    expect(clientGroup).toBeDefined();
  });
});
