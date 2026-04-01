import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import { refreshBodySchema } from '../../../utils/schemas/refresh.schema';
import { HttpError } from '../../../middleware/error.middleware';
import { refreshService } from './refresh.service';

export const refreshController = {
  async refresh(req: Request, res: Response): Promise<void> {
    let body;
    try {
      body = refreshBodySchema.parse(req.body);
    } catch (e) {
      if (e instanceof ZodError) {
        const first = e.errors[0];
        const msg = first ? `${first.path.join('.')}: ${first.message}` : 'Invalid input';
        throw new HttpError(400, msg);
      }
      throw e;
    }

    const result = await refreshService.execute(body);
    res.status(200).json({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  },
};
