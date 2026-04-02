import type { Request, Response } from 'express';
import { HttpError } from '../../../middleware/error.middleware';
import { getBearerToken } from '../../../utils/request.utils';
import { verifyAccessToken } from '../../auth/token.utils';
import { oauthBrowserSessionService } from './oauth-browser-session.service';

export const oauthBrowserSessionController = {
  async post(req: Request, res: Response): Promise<void> {
    const raw = getBearerToken(req);
    if (!raw) {
      throw new HttpError(401, 'Authorization Bearer token required');
    }
    const payload = verifyAccessToken(raw);
    const setCookie = await oauthBrowserSessionService.buildSetCookieHeader(payload.sub, payload.sid);
    res.append('Set-Cookie', setCookie);
    res.status(204).send();
  },
};
