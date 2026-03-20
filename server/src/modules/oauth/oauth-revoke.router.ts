import { Router } from 'express';
import { oauthRevokeController } from './oauth-revoke.controller';

export const oauthRevokeRouter = Router();

oauthRevokeRouter.post(
  '/revoke',
  (req, res) => oauthRevokeController.revoke(req, res)
);
