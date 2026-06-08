import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../../../middleware/error.middleware';
import { oauthBrowserSessionBodySchema } from '../../../utils/schemas/oauth.schema';
import {
  buildAbsoluteRequestUrl,
  getBearerToken,
  getClientIp,
  getUserAgent,
} from '../../../utils/request.utils';
import { verifyAccessToken } from '../../auth/token.utils';
import { oauthBrowserSessionService } from './oauth-browser-session.service';

function requireSafeReturnUrl(req: Request, returnUrl: string, clientId: string): void {
  let target: URL;
  try {
    target = new URL(returnUrl);
  } catch {
    throw new HttpError(400, 'Invalid returnUrl');
  }

  const requestOrigin = new URL(buildAbsoluteRequestUrl(req)).origin;
  if (
    target.origin !== requestOrigin ||
    target.pathname !== '/oauth/authorize' ||
    target.hash !== '' ||
    target.searchParams.getAll('response_type').length !== 1 ||
    target.searchParams.get('response_type') !== 'code' ||
    target.searchParams.getAll('client_id').length !== 1 ||
    target.searchParams.get('client_id') !== clientId ||
    target.searchParams.getAll('redirect_uri').length !== 1 ||
    !target.searchParams.get('redirect_uri')
  ) {
    throw new HttpError(400, 'Invalid returnUrl');
  }
}

export const oauthBrowserSessionController = {
  async post(req: Request, res: Response): Promise<void> {
    const bearer = getBearerToken(req);
    const bodyAccessToken =
      req.body &&
      typeof req.body === 'object' &&
      typeof (req.body as { accessToken?: unknown }).accessToken === 'string'
        ? (req.body as { accessToken: string }).accessToken
        : null;
    const raw = bearer ?? bodyAccessToken;
    if (!raw) {
      throw new HttpError(401, 'Authorization Bearer token required');
    }

    let body;
    try {
      body = oauthBrowserSessionBodySchema.parse(req.body);
    } catch (error) {
      if (error instanceof ZodError) {
        const first = error.errors[0];
        throw new HttpError(
          400,
          first ? `${first.path.join('.')}: ${first.message}` : 'Invalid input'
        );
      }
      throw error;
    }
    if (body.returnUrl) {
      requireSafeReturnUrl(req, body.returnUrl, body.clientId);
    }

    const payload = verifyAccessToken(raw);
    const setCookie = await oauthBrowserSessionService.buildSetCookieHeader(
      payload.sub,
      payload.sid,
      body.clientId,
      {
        ipAddress: getClientIp(req),
        userAgent: getUserAgent(req),
      }
    );
    res.append('Set-Cookie', setCookie);
    if (body.returnUrl) {
      res.redirect(303, body.returnUrl);
      return;
    }
    res.status(204).send();
  },
};
