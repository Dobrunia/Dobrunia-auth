import { Router } from 'express';
import { oauthTokenController } from './oauth-token.controller';

export const oauthTokenRouter = Router();

oauthTokenRouter.post('/token', (req, res) => oauthTokenController.token(req, res));
