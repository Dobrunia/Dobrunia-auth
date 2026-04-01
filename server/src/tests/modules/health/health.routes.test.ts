import express from 'express';
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { healthRouter } from '../../../modules/health/health.routes';

function createApp() {
  const app = express();
  app.use('/health', healthRouter);
  return app;
}

describe('health routes', () => {
  it('GET /health returns 200 with ok status and ISO timestamp', async () => {
    const res = await request(createApp()).get('/health').expect(200);

    expect(res.body).toMatchObject({ status: 'ok' });
    expect(typeof res.body.timestamp).toBe('string');
    expect(() => new Date(res.body.timestamp)).not.toThrow();
    expect(Number.isNaN(Date.parse(res.body.timestamp))).toBe(false);
  });

  it('GET /health does not match other paths', async () => {
    await request(createApp()).get('/health/extra').expect(404);
  });
});
