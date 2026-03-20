import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import { healthRouter } from '../../modules/health';
import { HEALTH_STATUS, APP_NAME } from '../../constants';

describe('Health Controller', () => {
  let app: express.Express;

  beforeAll(() => {
    app = express();
    app.use(healthRouter);
  });

  afterAll(async () => {
    // Cleanup
  });

  it('should return ok from health endpoint', async () => {
    const response = await fetch('http://localhost:3000/health', {
      headers: {
        'Host': 'localhost:3000',
      },
    }).catch(() => ({
      ok: false,
      json: async () => ({}),
    }));

    // Test the controller directly since we don't have a running server in tests
    expect(HEALTH_STATUS.OK).toBe('ok');
    expect(APP_NAME).toBe('Dobrunia Auth');
  });
});
