import express from 'express';
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { errorMiddleware, HttpError } from '../../middleware/error.middleware';

function createAppWithErrorRoute(setup: (app: express.Application) => void) {
  const app = express();
  setup(app);
  app.use(errorMiddleware);
  return app;
}

describe('errorMiddleware', () => {
  it('responds with status and message for HttpError', async () => {
    const app = createAppWithErrorRoute((app) => {
      app.get('/test', (_req, _res, next) => {
        next(new HttpError(404, 'Resource not found'));
      });
    });

    const res = await request(app).get('/test').expect(404);
    expect(res.body).toEqual({ error: { message: 'Resource not found' } });
  });

  it('responds 500 and generic message for plain Error', async () => {
    const app = createAppWithErrorRoute((app) => {
      app.get('/test', (_req, _res, next) => {
        next(new Error('database exploded'));
      });
    });

    const res = await request(app).get('/test').expect(500);
    expect(res.body).toEqual({ error: { message: 'Internal Server Error' } });
  });

  it('responds 500 for non-Error throw passed to next', async () => {
    const app = createAppWithErrorRoute((app) => {
      app.get('/test', (_req, _res, next) => {
        next('string failure');
      });
    });

    const res = await request(app).get('/test').expect(500);
    expect(res.body).toEqual({ error: { message: 'Internal Server Error' } });
  });

  it('does not send body when headers already sent', async () => {
    const app = express();
    app.get('/test', (req, res, next) => {
      res.status(200).send('partial');
      next(new HttpError(500, 'too late'));
    });
    app.use(errorMiddleware);

    const res = await request(app).get('/test').expect(200);
    expect(res.text).toBe('partial');
  });

  it('passes through HttpError status codes other than 404', async () => {
    const app = createAppWithErrorRoute((app) => {
      app.get('/test', (_req, _res, next) => {
        next(new HttpError(422, 'Validation failed'));
      });
    });

    const res = await request(app).get('/test').expect(422);
    expect(res.body).toEqual({ error: { message: 'Validation failed' } });
  });
});
