import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import { loginBodySchema } from '../../../utils/schemas/login.schema';
import { getClientIp, getUserAgent } from '../../../utils/request.utils';
import { HttpError } from '../../../middleware/error.middleware';
import { loginService } from './login.service';

export const loginController = {
  async login(req: Request, res: Response): Promise<void> {
    let body;
    try {
      body = loginBodySchema.parse(req.body);
    } catch (e) {
      if (e instanceof ZodError) {
        const first = e.errors[0];
        const msg = first ? `${first.path.join('.')}: ${first.message}` : 'Invalid input';
        throw new HttpError(400, msg);
      }
      throw e;
    }

    const result = await loginService.execute(body, {
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
    });

    res.status(200).json({
      user: result.user,
      session: result.session,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  },
};
