import { Router } from 'express';
import { healthController } from './health.controller';
import { ROUTES } from '../../constants';

export const healthRouter = Router();

healthRouter.get(ROUTES.HEALTH, (req, res) => healthController.getHealth(req, res));
