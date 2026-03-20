import { auditLogRepository } from './audit-log.repository';
import type { AuditEventCategory, AuditStatus } from '../../types/audit-log.types';

export interface AuditEvent {
  eventType: string;
  category: AuditEventCategory;
  userId?: number | null;
  clientId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  status: AuditStatus;
  details?: Record<string, any>;
}

export class AuditService {
  /**
   * Log an audit event
   */
  async log(event: AuditEvent): Promise<void> {
    try {
      await auditLogRepository.create({
        event_type: event.eventType as any,
        event_category: event.category,
        user_id: event.userId ?? null,
        client_id: event.clientId ?? null,
        ip_address: event.ipAddress ?? null,
        user_agent: event.userAgent ?? null,
        status: event.status,
        details: event.details ?? null,
      });
    } catch (error) {
      // Don't let audit logging failures break the main flow
      console.error('Audit log error:', error);
    }
  }

  /**
   * Log user registration
   */
  async logRegistration(
    userId: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      eventType: 'USER_REGISTERED',
      category: 'user_management',
      userId,
      ipAddress,
      userAgent,
      status: 'success',
      details: { method: 'email_password' },
    });
  }

  /**
   * Log user login attempt
   */
  async logLogin(
    userId: number | null,
    success: boolean,
    ipAddress?: string,
    userAgent?: string,
    reason?: string
  ): Promise<void> {
    await this.log({
      eventType: 'USER_LOGIN',
      category: 'authentication',
      userId,
      ipAddress,
      userAgent,
      status: success ? 'success' : 'failure',
      details: reason ? { reason } : undefined,
    });
  }

  /**
   * Log user logout
   */
  async logLogout(
    userId: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      eventType: 'USER_LOGOUT',
      category: 'authentication',
      userId,
      ipAddress,
      userAgent,
      status: 'success',
    });
  }

  /**
   * Log logout from all sessions
   */
  async logLogoutAll(
    userId: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      eventType: 'USER_LOGOUT_ALL',
      category: 'authentication',
      userId,
      ipAddress,
      userAgent,
      status: 'success',
    });
  }

  /**
   * Log password reset request
   */
  async logPasswordResetRequested(
    userId: number | null,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      eventType: 'PASSWORD_RESET_REQUESTED',
      category: 'authentication',
      userId,
      ipAddress,
      userAgent,
      status: 'success',
    });
  }

  /**
   * Log password reset completion
   */
  async logPasswordResetCompleted(
    userId: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      eventType: 'PASSWORD_RESET_COMPLETED',
      category: 'authentication',
      userId,
      ipAddress,
      userAgent,
      status: 'success',
    });
  }

  /**
   * Log email verification sent
   */
  async logEmailVerificationSent(
    userId: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      eventType: 'EMAIL_VERIFICATION_SENT',
      category: 'authentication',
      userId,
      ipAddress,
      userAgent,
      status: 'success',
    });
  }

  /**
   * Log email verification
   */
  async logEmailVerified(
    userId: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      eventType: 'EMAIL_VERIFIED',
      category: 'authentication',
      userId,
      ipAddress,
      userAgent,
      status: 'success',
    });
  }

  /**
   * Log OAuth token issuance
   */
  async logOAuthTokenIssued(
    userId: number,
    clientId: string,
    ipAddress?: string,
    userAgent?: string,
    scopes?: string[]
  ): Promise<void> {
    await this.log({
      eventType: 'OAUTH_TOKEN_ISSUED',
      category: 'oauth',
      userId,
      clientId,
      ipAddress,
      userAgent,
      status: 'success',
      details: { scopes },
    });
  }

  /**
   * Log OAuth token revocation
   */
  async logOAuthTokenRevoked(
    userId: number | null,
    clientId: string | null,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      eventType: 'OAUTH_TOKEN_REVOKED',
      category: 'oauth',
      userId,
      clientId,
      ipAddress,
      userAgent,
      status: 'success',
    });
  }

  /**
   * Log session revocation
   */
  async logSessionRevoked(
    userId: number,
    sessionId: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      eventType: 'SESSION_REVOKED',
      category: 'session',
      userId,
      ipAddress,
      userAgent,
      status: 'success',
      details: { sessionId },
    });
  }

  /**
   * Log revocation of all sessions
   */
  async logAllSessionsRevoked(
    userId: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      eventType: 'SESSION_REVOKED_ALL',
      category: 'session',
      userId,
      ipAddress,
      userAgent,
      status: 'success',
    });
  }
}

export const auditService = new AuditService();
