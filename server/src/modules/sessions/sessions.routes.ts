import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { requireAccessToken } from '../../middleware/access-auth.middleware';
import { sessionsController } from './sessions.controller';

export const sessionsRouter = Router();

sessionsRouter.use(requireAccessToken);
sessionsRouter.get('/', asyncHandler(sessionsController.listMine));
sessionsRouter.delete('/:id', asyncHandler(sessionsController.deleteMine));
