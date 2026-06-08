import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../../middleware/error.middleware';
import { clientRegistrationBodySchema } from '../../utils/schemas/client-registration.schema';
import { clientsService } from './clients.service';

function requireUserId(req: Request): string {
  const auth = req.accessAuth;
  if (!auth) {
    throw new HttpError(401, 'Authorization Bearer token required');
  }
  return auth.sub;
}

export const clientsController = {
  async listMine(req: Request, res: Response): Promise<void> {
    const clients = await clientsService.listMine(requireUserId(req));
    res.json({ clients });
  },

  async register(req: Request, res: Response): Promise<void> {
    let body;
    try {
      body = clientRegistrationBodySchema.parse(req.body);
    } catch (error) {
      if (error instanceof ZodError) {
        const first = error.errors[0];
        const message = first ? `${first.path.join('.')}: ${first.message}` : 'Invalid input';
        throw new HttpError(400, message);
      }
      throw error;
    }

    const client = await clientsService.register(requireUserId(req), body);
    res.status(201).json({ client });
  },
};
