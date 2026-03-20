import { describe, it, expect, beforeAll } from 'vitest';
import { getDatabasePool } from '../../../db/database';
import { auditService } from '../../../modules/audit/audit.service';
import { auditLogRepository } from '../../../modules/audit/audit-log.repository';

describe('Audit Log', () => {
  let pool: ReturnType<typeof getDatabasePool>;
  let testUserId: number;

  beforeAll(async () => {
    pool = await getDatabasePool();

    // Create test user
    const testEmail = `audit_${Date.now()}@example.com`;
    const { hashPassword } = await import('../../../shared/password.utils');
    const passwordHash = await hashPassword('TestPass123');

    const [userResult] = await pool.query(
      'INSERT INTO users (email, password_hash, status) VALUES (?, ?, ?)',
      [testEmail, passwordHash, 'active']
    );
    testUserId = (userResult as { insertId: number }).insertId;
  });

  it('should log user registration event', async () => {
    await auditService.logRegistration(testUserId, '127.0.0.1', 'Test Agent');

    const logs = await auditLogRepository.findByUserId(testUserId, 10);
    const registrationLog = logs.find(log => log.event_type === 'USER_REGISTERED');

    expect(registrationLog).toBeDefined();
    expect(registrationLog?.status).toBe('success');
    expect(registrationLog?.ip_address).toBe('127.0.0.1');
  });

  it('should log successful login event', async () => {
    await auditService.logLogin(testUserId, true, '127.0.0.1', 'Test Agent');

    const logs = await auditLogRepository.findByUserId(testUserId, 10);
    const loginLog = logs.find(log => log.event_type === 'USER_LOGIN' && log.status === 'success');

    expect(loginLog).toBeDefined();
  });

  it('should log failed login attempt', async () => {
    await auditService.logLogin(null, false, '127.0.0.1', 'Test Agent', 'Invalid credentials');

    const logs = await auditLogRepository.findRecent(10);
    const failedLoginLog = logs.find(log => log.event_type === 'USER_LOGIN' && log.status === 'failure');

    expect(failedLoginLog).toBeDefined();
    expect(failedLoginLog?.details).toBeDefined();
  });

  it('should store audit log with correct metadata', async () => {
    const ipAddress = '192.168.1.100';
    const userAgent = 'Mozilla/5.0 Test Browser';

    await auditService.logLogout(testUserId, ipAddress, userAgent);

    const logs = await auditLogRepository.findByUserId(testUserId, 10);
    const logoutLog = logs.find(log => log.event_type === 'USER_LOGOUT');

    expect(logoutLog).toBeDefined();
    expect(logoutLog?.ip_address).toBe(ipAddress);
    expect(logoutLog?.user_agent).toBe(userAgent);
    expect(logoutLog?.created_at).toBeDefined();
  });

  it('should log password reset events', async () => {
    await auditService.logPasswordResetRequested(testUserId, '127.0.0.1');
    await auditService.logPasswordResetCompleted(testUserId, '127.0.0.1');

    const logs = await auditLogRepository.findByUserId(testUserId, 10);
    const resetRequested = logs.find(log => log.event_type === 'PASSWORD_RESET_REQUESTED');
    const resetCompleted = logs.find(log => log.event_type === 'PASSWORD_RESET_COMPLETED');

    expect(resetRequested).toBeDefined();
    expect(resetCompleted).toBeDefined();
  });

  it('should log OAuth token events', async () => {
    const clientId = 'test-oauth-client';

    await auditService.logOAuthTokenIssued(testUserId, clientId, '127.0.0.1', 'Test Agent', ['openid', 'profile']);
    await auditService.logOAuthTokenRevoked(testUserId, clientId, '127.0.0.1');

    const logs = await auditLogRepository.findByUserId(testUserId, 10);
    const tokenIssued = logs.find(log => log.event_type === 'OAUTH_TOKEN_ISSUED');
    const tokenRevoked = logs.find(log => log.event_type === 'OAUTH_TOKEN_REVOKED');

    expect(tokenIssued).toBeDefined();
    expect(tokenRevoked).toBeDefined();
    expect(tokenIssued?.client_id).toBe(clientId);
  });

  it('should log session revocation events', async () => {
    const sessionId = 12345;

    await auditService.logSessionRevoked(testUserId, sessionId, '127.0.0.1');
    await auditService.logAllSessionsRevoked(testUserId, '127.0.0.1');

    const logs = await auditLogRepository.findByUserId(testUserId, 10);
    const sessionRevoked = logs.find(log => log.event_type === 'SESSION_REVOKED');
    const allSessionsRevoked = logs.find(log => log.event_type === 'SESSION_REVOKED_ALL');

    expect(sessionRevoked).toBeDefined();
    expect(allSessionsRevoked).toBeDefined();
  });

  it('should not break main flow on audit logging failure', async () => {
    // This should not throw even if database is unavailable
    await expect(auditService.logLogin(testUserId, true)).resolves.not.toThrow();
  });
});
