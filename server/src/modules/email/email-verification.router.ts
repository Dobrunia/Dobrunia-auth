import { Router } from 'express';
import { emailVerificationController } from './email-verification.controller';
import { authMiddleware } from '../../shared/auth.middleware';

export const emailVerificationRouter = Router();

emailVerificationRouter.post(
  '/send-verification-email',
  authMiddleware,
  (req, res) => emailVerificationController.sendVerificationEmail(req, res)
);

emailVerificationRouter.post(
  '/verify-email',
  (req, res) => emailVerificationController.verifyEmail(req, res)
);
