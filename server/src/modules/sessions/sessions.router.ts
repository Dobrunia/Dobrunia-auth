import { Router } from 'express';
import { sessionsController } from './sessions.controller';
import { authMiddleware } from '../../shared/auth.middleware';

export const sessionsRouter = Router();

sessionsRouter.get('/me/sessions', authMiddleware, (req, res) => sessionsController.getSessions(req, res));
sessionsRouter.get('/me/sessions/by-client', authMiddleware, (req, res) => sessionsController.getSessionsByClient(req, res));
sessionsRouter.get('/me/active-services', authMiddleware, (req, res) => sessionsController.getActiveServices(req, res));
sessionsRouter.delete('/me/sessions/:id', authMiddleware, (req, res) => sessionsController.revokeSession(req, res));
sessionsRouter.delete('/me/sessions/by-client/:clientId', authMiddleware, (req, res) => sessionsController.revokeSessionsByClient(req, res));
