import { Request, Response } from 'express';
import { authService } from './auth.service';
import { registerSchema, loginSchema } from '../../shared/schemas';

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

      // Login user
      const result = await authService.login(validatedData, userAgent, ipAddress);

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
}

export const authController = new AuthController();
