import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { requireActiveAccessToken } from '../../middleware/access-auth.middleware';
import { sessionsController } from '../sessions/sessions.controller';
import { clientsController } from './clients.controller';

/**
 * Регистрация и управление OAuth-клиентами, а также сессии в их контексте.
 */
export const clientsRouter = Router();

clientsRouter.get(
  '/',
  asyncHandler(requireActiveAccessToken),
  asyncHandler(clientsController.listMine)
);

clientsRouter.post(
  '/',
  asyncHandler(requireActiveAccessToken),
  asyncHandler(clientsController.register)
);

clientsRouter.patch(
  '/:id',
  asyncHandler(requireActiveAccessToken),
  asyncHandler(clientsController.update)
);

clientsRouter.delete(
  '/:id',
  asyncHandler(requireActiveAccessToken),
  asyncHandler(clientsController.delete)
);

clientsRouter.get(
  '/:id/management/sessions',
  asyncHandler(requireActiveAccessToken),
  asyncHandler(clientsController.listManagedSessions)
);

clientsRouter.delete(
  '/:id/management/sessions/:sessionId',
  asyncHandler(requireActiveAccessToken),
  asyncHandler(clientsController.revokeManagedSession)
);

clientsRouter.get(
  '/:id/sessions',
  asyncHandler(requireActiveAccessToken),
  asyncHandler(sessionsController.listMineForClient)
);
