import { Response } from 'express';
import type { AuthRequest } from '../../shared/auth.middleware';
import { usersRepository } from '../users/users.repository';

export class MeController {
  async getMe(req: AuthRequest, res: Response): Promise<void> {
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

      res.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          email_verified: user.email_verified,
          name: user.name,
          avatar: user.avatar,
          status: user.status,
          created_at: user.created_at,
        },
      });
    } catch (error) {
      console.error('Get me error:', error);
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

export const meController = new MeController();
