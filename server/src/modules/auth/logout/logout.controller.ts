import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import { logoutBodySchema } from '../../../utils/schemas/logout.schema';
import { HttpError } from '../../../middleware/error.middleware';
import { logoutService } from './logout.service';

export const logoutController = {
  async logout(req: Request, res: Response): Promise<void> {
    let body;
    try {
      body = logoutBodySchema.parse(req.body);
    } catch (e) {
      if (e instanceof ZodError) {
        const first = e.errors[0];
        const msg = first ? `${first.path.join('.')}: ${first.message}` : 'Invalid input';
        throw new HttpError(400, msg);
      }
      throw e;
    }

    await logoutService.execute(body);
    res.status(204).end();
  },
};
