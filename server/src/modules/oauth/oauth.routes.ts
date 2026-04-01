import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { oauthAuthorizeController } from './authorize/authorize.controller';
import { oauthTokenController } from './token/token.controller';

export const oauthRouter = Router();

oauthRouter.get('/authorize', asyncHandler(oauthAuthorizeController.get));
oauthRouter.post('/authorize', asyncHandler(oauthAuthorizeController.post));
oauthRouter.post('/token', asyncHandler(oauthTokenController.post));
