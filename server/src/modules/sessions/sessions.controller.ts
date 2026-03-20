import { Request, Response } from 'express';
import type { AuthRequest } from '../../shared/auth.middleware';
import { sessionsRepository } from '../sessions/sessions.repository';
import { refreshTokensRepository } from '../tokens/refresh-tokens.repository';

export class SessionsController {
  /**
   * Get all sessions for current user
   */
  async getSessions(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
        });
        return;
      }

      const sessions = await sessionsRepository.findByUserId(req.user.user_id);

      // Map sessions with is_current flag
      const sessionsWithCurrent = sessions.map((session) => ({
        ...session,
        is_current: session.id === req.user!.session_id,
      }));

      res.json({
        success: true,
        data: sessionsWithCurrent,
      });
    } catch (error) {
      console.error('Get sessions error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      });
    }
  }

  /**
   * Get sessions grouped by client/service
   */
  async getSessionsByClient(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
        });
        return;
      }

      const groupedSessions = await sessionsRepository.findByUserIdGroupedByClient(req.user.user_id);

      res.json({
        success: true,
        data: groupedSessions,
      });
    } catch (error) {
      console.error('Get sessions by client error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      });
    }
  }

  /**
   * Get active services (services where user has active sessions)
   */
  async getActiveServices(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
        });
        return;
      }

      const groupedSessions = await sessionsRepository.findByUserIdGroupedByClient(req.user.user_id);

      // Filter to only active services (not revoked)
      const activeServices = groupedSessions
        .filter(group => group.client_id !== 'direct')
        .map(group => ({
          client_id: group.client_id as number,
          service_name: group.service_name,
          last_active: group.last_active,
          session_count: group.session_count,
        }));

      res.json({
        success: true,
        data: activeServices,
      });
    } catch (error) {
      console.error('Get active services error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      });
    }
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
        });
        return;
      }

      const sessionId = parseInt(req.params.id, 10);

      if (isNaN(sessionId)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid session ID',
          },
        });
        return;
      }

      // Verify session belongs to user
      const session = await sessionsRepository.findById(sessionId);

      if (!session) {
        res.status(404).json({
          success: false,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: 'Session not found',
          },
        });
        return;
      }

      if (session.user_id !== req.user.user_id) {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Cannot revoke session of another user',
          },
        });
        return;
      }

      // Cannot revoke current session via this endpoint
      if (session.id === req.user.session_id) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_OPERATION',
            message: 'Use /logout to end current session',
          },
        });
        return;
      }

      // Revoke session
      await sessionsRepository.revoke(sessionId);

      // Revoke refresh tokens for this session
      await refreshTokensRepository.revokeAllForSession(sessionId);

      res.json({
        success: true,
        message: 'Session revoked successfully',
      });
    } catch (error) {
      console.error('Revoke session error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      });
    }
  }

  /**
   * Revoke all sessions for a specific client/service
   */
  async revokeSessionsByClient(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
        });
        return;
      }

      const clientId = parseInt(req.params.clientId, 10);

      if (isNaN(clientId)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid client ID',
          },
        });
        return;
      }

      // Revoke all sessions for this client
      await sessionsRepository.revokeAllForClient(req.user.user_id, clientId);

      // Note: Refresh tokens will be invalidated when sessions are checked
      // For complete cleanup, you could also revoke refresh tokens here

      res.json({
        success: true,
        message: 'Sessions revoked successfully',
      });
    } catch (error) {
      console.error('Revoke sessions by client error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      });
    }
  }
}

export const sessionsController = new SessionsController();
