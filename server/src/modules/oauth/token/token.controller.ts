import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import { oauthTokenBodySchema } from '../../../utils/schemas/oauth.schema';
import { HttpError } from '../../../middleware/error.middleware';
import { oauthTokenService } from './token.service';

export const oauthTokenController = {
  async post(req: Request, res: Response): Promise<void> {
    let body;
    try {
      body = oauthTokenBodySchema.parse(req.body);
    } catch (e) {
      if (e instanceof ZodError) {
        const first = e.errors[0];
        const msg = first ? `${first.path.join('.')}: ${first.message}` : 'Invalid input';
        throw new HttpError(400, msg);
      }
      throw e;
    }

    const result = await oauthTokenService.execute(body);
    res.status(200).json({
      user: result.user,
      session: result.session,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  },
};
