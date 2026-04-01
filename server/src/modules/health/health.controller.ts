import type { Request, Response } from 'express';
import { healthService } from './health.service';

export const healthController = {
  getHealth(_req: Request, res: Response): void {
    const payload = healthService.getHealth();
    res.status(200).json(payload);
  },
};
