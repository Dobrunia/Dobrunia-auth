import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import { registerBodySchema } from '../../../utils/schemas/register.schema';
import { getClientIp, getUserAgent } from '../../../utils/request.utils';
import { HttpError } from '../../../middleware/error.middleware';
import { registerService } from './register.service';

export const registerController = {
  async register(req: Request, res: Response): Promise<void> {
    let body;
    try {
      body = registerBodySchema.parse(req.body);
    } catch (e) {
      if (e instanceof ZodError) {
        const first = e.errors[0];
        const msg = first ? `${first.path.join('.')}: ${first.message}` : 'Invalid input';
        throw new HttpError(400, msg);
      }
      throw e;
    }

    const result = await registerService.execute(body, {
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
    });

    res.status(201).json({
      user: result.user,
      session: result.session,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  },
};
