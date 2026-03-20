import { Request, Response } from 'express';
import { APP_NAME, HEALTH_STATUS } from '../../constants';
import { HealthResponse } from '../../types';

export class HealthController {
  async getHealth(_req: Request, res: Response<HealthResponse>): Promise<void> {
    res.json({
      status: HEALTH_STATUS.OK,
      timestamp: new Date().toISOString(),
      service: APP_NAME,
    });
  }
}

export const healthController = new HealthController();
