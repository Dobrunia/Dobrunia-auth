import { Router } from 'express';
import { oauthAuthorizeController } from './oauth-authorize.controller';

export const oauthAuthorizeRouter = Router();

oauthAuthorizeRouter.get('/authorize', (req, res) => oauthAuthorizeController.authorize(req, res));
