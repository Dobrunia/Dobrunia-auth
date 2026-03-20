import { Router } from 'express';
import { oauthUserInfoController } from './oauth-userinfo.controller';
import { authMiddleware } from '../../shared/auth.middleware';

export const oauthUserInfoRouter = Router();

oauthUserInfoRouter.get(
  '/userinfo',
  authMiddleware,
  (req, res) => oauthUserInfoController.userinfo(req, res)
);
