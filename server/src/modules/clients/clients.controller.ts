import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../../middleware/error.middleware';
import {
  clientRegistrationBodySchema,
  clientUpdateBodySchema,
} from '../../utils/schemas/client-registration.schema';
import { clientsService } from './clients.service';

function requireUserId(req: Request): string {
  const auth = req.accessAuth;
  if (!auth) {
    throw new HttpError(401, 'Authorization Bearer token required');
  }
  return auth.sub;
}

function requirePathId(value: string | undefined, message: string): string {
  if (!value) {
    throw new HttpError(400, message);
  }
  return value;
}

function parseBody<T>(schema: { parse(value: unknown): T }, value: unknown): T {
  try {
    return schema.parse(value);
  } catch (error) {
    if (error instanceof ZodError) {
      const first = error.errors[0];
      const message = first ? `${first.path.join('.')}: ${first.message}` : 'Invalid input';
      throw new HttpError(400, message);
    }
    throw error;
  }
}

export const clientsController = {
  async listMine(req: Request, res: Response): Promise<void> {
    const clients = await clientsService.listMine(requireUserId(req));
    res.json({ clients });
  },

  async register(req: Request, res: Response): Promise<void> {
    const body = parseBody(clientRegistrationBodySchema, req.body);
    const client = await clientsService.register(requireUserId(req), body);
    res.status(201).json({ client });
  },

  async update(req: Request, res: Response): Promise<void> {
    const body = parseBody(clientUpdateBodySchema, req.body);
    const client = await clientsService.update(
      requireUserId(req),
      requirePathId(req.params.id, 'Invalid client id'),
      body
    );
    res.json({ client });
  },

  async delete(req: Request, res: Response): Promise<void> {
    await clientsService.delete(
      requireUserId(req),
      requirePathId(req.params.id, 'Invalid client id')
    );
    res.status(204).send();
  },

  async listManagedSessions(req: Request, res: Response): Promise<void> {
    const sessions = await clientsService.listManagedSessions(
      requireUserId(req),
      requirePathId(req.params.id, 'Invalid client id')
    );
    res.json({ sessions });
  },

  async revokeManagedSession(req: Request, res: Response): Promise<void> {
    await clientsService.revokeManagedSession(
      requireUserId(req),
      requirePathId(req.params.id, 'Invalid client id'),
      requirePathId(req.params.sessionId, 'Invalid session id')
    );
    res.status(204).send();
  },
};
