import type { Request, Response } from 'express';
import { HttpError } from '../../middleware/error.middleware';
import { sessionsService } from './sessions.service';

function requirePayload(req: Request) {
  const auth = req.accessAuth;
  if (!auth) {
    throw new HttpError(401, 'Authorization Bearer token required');
  }
  return auth;
}

export const sessionsController = {
  async listMine(req: Request, res: Response): Promise<void> {
    const auth = requirePayload(req);
    const result = await sessionsService.listForUser(auth.sub);
    res.status(200).json(result);
  },

  async deleteMine(req: Request, res: Response): Promise<void> {
    const auth = requirePayload(req);
    const id = req.params.id;
    if (!id || typeof id !== 'string') {
      throw new HttpError(400, 'Invalid session id');
    }
    await sessionsService.revokeSessionForUser(auth.sub, id);
    res.status(204).send();
  },

  async listMineForClient(req: Request, res: Response): Promise<void> {
    const auth = requirePayload(req);
    const clientKey = req.params.id;
    if (!clientKey || typeof clientKey !== 'string') {
      throw new HttpError(400, 'Invalid client id');
    }
    const result = await sessionsService.listForUserByClientKey(auth.sub, clientKey);
    res.status(200).json(result);
  },
};
