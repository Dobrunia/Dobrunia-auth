import { Router } from 'express';
import { meController } from './me.controller';
import { authMiddleware } from '../../shared/auth.middleware';
import { sessionsRouter } from '../sessions/sessions.router';

export const usersRouter = Router();

usersRouter.get('/me', authMiddleware, (req, res) => meController.getMe(req, res));
usersRouter.use(sessionsRouter);
