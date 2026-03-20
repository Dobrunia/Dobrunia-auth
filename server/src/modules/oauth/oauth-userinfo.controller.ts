import { Request, Response } from 'express';
import type { AuthRequest } from '../../shared/auth.middleware';
import { usersRepository } from '../users/users.repository';
import type { UserInfoResponse } from '../../types/oauth-userinfo.types';

export class OAuthUserInfoController {
  async userinfo(req: Request, res: Response): Promise<void> {
    try {
      // Get user from auth middleware
      const authReq = req as AuthRequest;
      
      if (!authReq.user) {
        res.status(401).json({
          success: false,
          error: {
            error: 'invalid_token',
            error_description: 'Invalid or missing access token',
          },
        });
        return;
      }

      // Get user from database
      const user = await usersRepository.findById(authReq.user.user_id);

      if (!user) {
        res.status(404).json({
          success: false,
          error: {
            error: 'invalid_token',
            error_description: 'User not found',
          },
        });
        return;
      }

      // Get requested scopes from token
      const scopes = authReq.user.scopes || [];

      // Build OIDC UserInfo response based on scopes
      const userInfo: UserInfoResponse = {
        sub: user.id.toString(),
      };

      // 'openid' scope is required for UserInfo
      if (scopes.includes('openid')) {
        // 'profile' scope claims
        if (scopes.includes('profile')) {
          userInfo.name = user.name;
          userInfo.picture = user.avatar || undefined;
          userInfo.updated_at = Math.floor(user.updated_at.getTime() / 1000);
        }

        // 'email' scope claims
        if (scopes.includes('email')) {
          userInfo.email = user.email;
          userInfo.email_verified = user.email_verified;
        }
      }

      res.json(userInfo);
    } catch (error) {
      console.error('UserInfo error:', error);
      res.status(500).json({
        success: false,
        error: {
          error: 'server_error',
          error_description: 'Internal server error',
        },
      });
    }
  }
}

export const oauthUserInfoController = new OAuthUserInfoController();
