import { Request, Response } from 'express';
import type { AuthRequest } from '../../shared/auth.middleware';
import { emailVerificationService } from './email-verification.service';
import { usersRepository } from '../users/users.repository';

export class EmailVerificationController {
  async sendVerificationEmail(req: AuthRequest, res: Response): Promise<void> {
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

      // Get user to get email
      const user = await usersRepository.findById(req.user.user_id);

      if (!user) {
        res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
          },
        });
        return;
      }

      if (user.email_verified) {
        res.status(400).json({
          success: false,
          error: {
            code: 'ALREADY_VERIFIED',
            message: 'Email is already verified',
          },
        });
        return;
      }

      // Send verification email
      await emailVerificationService.sendVerificationEmail(user.id, user.email);

      res.json({
        success: true,
        message: 'Verification email sent',
      });
    } catch (error) {
      console.error('Send verification email error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      });
    }
  }

  async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.body;

      if (!token) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Verification token is required',
          },
        });
        return;
      }

      // Verify email
      const result = await emailVerificationService.verifyEmail(token);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: {
            code: result.message.includes('expired') ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
            message: result.message,
          },
        });
        return;
      }

      res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      console.error('Verify email error:', error);
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

export const emailVerificationController = new EmailVerificationController();
