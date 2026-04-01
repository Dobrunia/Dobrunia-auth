import type { HealthStatus } from '../../types/health.types';

export const healthService = {
  getHealth(): HealthStatus {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  },
};
