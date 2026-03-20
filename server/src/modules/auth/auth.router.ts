import { Router } from 'express';
import { authController } from './auth.controller';
import { authMiddleware } from '../../shared/auth.middleware';
import { rateLimit } from '../../shared/rate-limit.middleware';

export const authRouter = Router();

authRouter.post('/register', rateLimit('REGISTER', (req) => `register:${req.ip || 'unknown'}`), (req, res) => authController.register(req, res));
authRouter.post('/login', rateLimit('LOGIN', (req) => `login:${req.ip || 'unknown'}`), (req, res) => authController.login(req, res));
authRouter.post('/refresh', rateLimit('REFRESH_TOKEN', (req) => `refresh_token:${req.ip || 'unknown'}`), (req, res) => authController.refresh(req, res));
authRouter.post('/logout', authMiddleware, (req, res) => authController.logout(req, res));
authRouter.post('/logout-all', authMiddleware, (req, res) => authController.logoutAll(req, res));
