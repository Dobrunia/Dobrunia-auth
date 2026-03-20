import { Router } from 'express';
import { passwordResetController } from './password-reset.controller';
import { rateLimit } from '../../shared/rate-limit.middleware';

export const passwordResetRouter = Router();

passwordResetRouter.post(
  '/forgot-password',
  rateLimit('PASSWORD_RESET', (req) => {
    const email = req.body?.email;
    const ip = req.ip || 'unknown';
    return email ? `password_reset:email:${email}` : `password_reset:ip:${ip}`;
  }),
  (req, res) => passwordResetController.forgotPassword(req, res)
);

passwordResetRouter.post(
  '/reset-password',
  rateLimit('PASSWORD_RESET', (req) => `password_reset:ip:${req.ip || 'unknown'}`),
  (req, res) => passwordResetController.resetPassword(req, res)
);
