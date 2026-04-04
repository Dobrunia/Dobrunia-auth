import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { requireActiveAccessToken } from '../../middleware/access-auth.middleware';
import { sessionsController } from './sessions.controller';

export const sessionsRouter = Router();

sessionsRouter.use(asyncHandler(requireActiveAccessToken));
sessionsRouter.get('/', asyncHandler(sessionsController.listMine));
sessionsRouter.delete('/:id', asyncHandler(sessionsController.deleteMine));
