import type { Request, Response } from 'express';
import { getBearerToken } from '../../../utils/request.utils';
import { HttpError } from '../../../middleware/error.middleware';
import { verifyAccessToken } from '../token.utils';
import { meService } from './me.service';

export const meController = {
  async getMe(req: Request, res: Response): Promise<void> {
    const raw = getBearerToken(req);
    if (!raw) {
      throw new HttpError(401, 'Authorization Bearer token required');
    }

    const payload = verifyAccessToken(raw);
    const result = await meService.execute({
      userId: payload.sub,
      sessionId: payload.sid,
    });

    res.status(200).json(result);
  },
};
