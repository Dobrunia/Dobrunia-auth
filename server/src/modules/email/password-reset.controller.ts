import { Request, Response } from 'express';
import { passwordResetService } from './password-reset.service';

export class PasswordResetController {
  async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Email is required',
          },
        });
        return;
      }

      // Send password reset email
      const result = await passwordResetService.forgotPassword(email);

      res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      });
    }
  }

  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, password } = req.body;

      if (!token) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Reset token is required',
          },
        });
        return;
      }

      if (!password) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'New password is required',
          },
        });
        return;
      }

      // Reset password
      const result = await passwordResetService.resetPassword(token, password);

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
      console.error('Reset password error:', error);
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

export const passwordResetController = new PasswordResetController();
