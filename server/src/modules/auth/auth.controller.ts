import { Request, Response } from 'express';
import { authService } from './auth.service';
import { registerSchema, loginSchema } from '../../shared/schemas';
import type { AuthRequest } from '../../shared/auth.middleware';

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const validatedData = registerSchema.parse(req.body);

      // Register user
      const user = await authService.register(validatedData);

      res.status(201).json({
        success: true,
        data: user,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Email already registered') {
          res.status(409).json({
            success: false,
            error: {
              code: 'EMAIL_EXISTS',
              message: error.message,
            },
          });
          return;
        }

        if (error.constructor.name === 'ZodError') {
          res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: error.message,
            },
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      });
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const validatedData = loginSchema.parse(req.body);

      // Get user agent and IP
      const userAgent = req.headers['user-agent'];
      const ipAddress = req.ip || req.socket.remoteAddress;

      // Extract client_id from Authorization header or body
      const clientId = req.body.client_id || this.extractClientIdFromToken(req);

      // Login user
      const result = await authService.login(validatedData, userAgent as string, ipAddress as string, clientId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Invalid email or password' || error.message === 'Account is inactive') {
          res.status(401).json({
            success: false,
            error: {
              code: 'INVALID_CREDENTIALS',
              message: error.message,
            },
          });
          return;
        }

        if (error.constructor.name === 'ZodError') {
          res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: error.message,
            },
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      });
    }
  }

  private extractClientIdFromToken(req: Request): string | undefined {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return undefined;
    }

    try {
      const token = authHeader.substring(7);
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      return payload.client_id;
    } catch {
      return undefined;
    }
  }

  async refresh(req: Request, res: Response): Promise<void> {
    try {
      const { refresh_token } = req.body;

      if (!refresh_token) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Refresh token is required',
          },
        });
        return;
      }

      // Refresh tokens
      const result = await authService.refresh(refresh_token);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Invalid refresh token' || 
            error.message === 'Refresh token not found' ||
            error.message === 'Refresh token has been revoked' ||
            error.message === 'Refresh token has expired' ||
            error.message === 'Session is no longer active') {
          res.status(401).json({
            success: false,
            error: {
              code: 'INVALID_REFRESH_TOKEN',
              message: error.message,
            },
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      });
    }
  }

  async logout(req: AuthRequest, res: Response): Promise<void> {
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

      // Logout current session
      await authService.logout(req.user.user_id, req.user.session_id);

      res.json({
        success: true,
        message: 'Successfully logged out',
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      });
    }
  }

  async logoutAll(req: AuthRequest, res: Response): Promise<void> {
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

      // Logout all sessions
      await authService.logoutAll(req.user.user_id);

      res.json({
        success: true,
        message: 'Successfully logged out from all sessions',
      });
    } catch (error) {
      console.error('Logout all error:', error);
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

export const authController = new AuthController();
