import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { requireActiveAccessToken } from '../../middleware/access-auth.middleware';
import { sessionsController } from '../sessions/sessions.controller';
import { clientsController } from './clients.controller';

/**
 * Маршруты под `/clients` (сессии текущего пользователя по проекту).
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

clientsRouter.get(
  '/:id/sessions',
  asyncHandler(requireActiveAccessToken),
  asyncHandler(sessionsController.listMineForClient)
);
