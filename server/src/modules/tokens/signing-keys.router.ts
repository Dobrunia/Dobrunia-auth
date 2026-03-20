import { Router } from 'express';
import { signingKeysController } from './signing-keys.controller';

export const signingKeysRouter = Router();

signingKeysRouter.get(
  '/admin/signing-keys/status',
  (req, res) => signingKeysController.getStatus(req, res)
);

signingKeysRouter.post(
  '/admin/signing-keys/rotate',
  (req, res) => signingKeysController.rotateKey(req, res)
);

signingKeysRouter.post(
  '/admin/signing-keys/cleanup',
  (req, res) => signingKeysController.cleanup(req, res)
);
