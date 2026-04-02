import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { oauthAuthorizeController } from './authorize/authorize.controller';
import { oauthBrowserSessionController } from './browser-session/oauth-browser-session.controller';
import { oauthTokenController } from './token/token.controller';

export const oauthRouter = Router();

oauthRouter.get('/authorize', asyncHandler(oauthAuthorizeController.get));
oauthRouter.post('/authorize', asyncHandler(oauthAuthorizeController.post));
oauthRouter.post('/browser-session', asyncHandler(oauthBrowserSessionController.post));
oauthRouter.post('/token', asyncHandler(oauthTokenController.post));
