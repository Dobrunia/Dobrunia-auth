import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { requireAccessToken } from '../../middleware/access-auth.middleware';
import { sessionsController } from '../sessions/sessions.controller';

/**
 * Маршруты под `/clients` (сессии текущего пользователя по проекту).
 */
export const clientsRouter = Router();

clientsRouter.get(
  '/:id/sessions',
  requireAccessToken,
  asyncHandler(sessionsController.listMineForClient)
);
