import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import { getBearerToken } from '../../../utils/request.utils';
import { HttpError } from '../../../middleware/error.middleware';
import { profilePatchBodySchema } from '../../../utils/schemas/profile.schema';
import { verifyAccessToken } from '../token.utils';
import { meService } from './me.service';
import { profileService } from '../profile/profile.service';

function requireAccessPayload(req: Request) {
  const raw = getBearerToken(req);
  if (!raw) {
    throw new HttpError(401, 'Authorization Bearer token required');
  }
  return verifyAccessToken(raw);
}

export const meController = {
  async getMe(req: Request, res: Response): Promise<void> {
    const payload = requireAccessPayload(req);
    const result = await meService.execute({
      userId: payload.sub,
      sessionId: payload.sid,
    });

    res.status(200).json(result);
  },

  async patchMe(req: Request, res: Response): Promise<void> {
    const payload = requireAccessPayload(req);
    let body;
    try {
      body = profilePatchBodySchema.parse(req.body);
    } catch (e) {
      if (e instanceof ZodError) {
        const first = e.errors[0];
        const msg = first ? `${first.path.join('.')}: ${first.message}` : 'Invalid input';
        throw new HttpError(400, msg);
      }
      throw e;
    }

    const result = await profileService.updateProfile(payload.sub, payload.sid, body);
    res.status(200).json(result);
  },

  async deleteMe(req: Request, res: Response): Promise<void> {
    const payload = requireAccessPayload(req);
    await profileService.deleteAccount(payload.sub, payload.sid);
    res.status(204).send();
  },
};
