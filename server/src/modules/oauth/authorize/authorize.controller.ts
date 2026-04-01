import type { Request, Response } from 'express';
import { oauthAuthorizeService } from './authorize.service';

export const oauthAuthorizeController = {
  async get(req: Request, res: Response): Promise<void> {
    const result = await oauthAuthorizeService.handleGet(req);
    if (result.kind === 'redirect') {
      res.redirect(302, result.location);
      return;
    }
    res.status(result.status).type('html').send(result.body);
  },

  async post(req: Request, res: Response): Promise<void> {
    const result = await oauthAuthorizeService.handlePost(req);
    if (result.kind === 'redirect') {
      res.append('Set-Cookie', result.setCookie);
      res.redirect(302, result.location);
      return;
    }
    res.status(result.status).type('html').send(result.body);
  },
};
