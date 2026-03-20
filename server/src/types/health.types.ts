/**
 * Health endpoint types
 */

import { HEALTH_STATUS } from '../constants';

export type HealthStatus = typeof HEALTH_STATUS.OK | typeof HEALTH_STATUS.ERROR;

export interface HealthResponse {
  status: HealthStatus;
  timestamp: string;
  service: string;
}
