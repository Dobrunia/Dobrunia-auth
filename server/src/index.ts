import express from 'express';
import { config } from './config';
import { getDatabasePool, closeDatabasePool } from './db/database';
import { runMigrations } from './db/migrate';
import { healthRouter } from './modules/health/health.routes';
import { authRouter } from './modules/auth/auth.routes';
import { oauthRouter } from './modules/oauth/oauth.routes';
import { sessionsRouter } from './modules/sessions/sessions.routes';
import { clientsRouter } from './modules/clients/clients.routes';
import { errorMiddleware } from './middleware/error.middleware';
import { corsMiddleware } from './middleware/cors.middleware';
import { Log } from './utils/log';

async function bootstrap(): Promise<void> {
  try {
    // Create Express app
    const app = express();
    app.set('trust proxy', 1);

    // Middleware
    app.use(corsMiddleware);
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Routes
    app.use('/health', healthRouter);
    app.use('/auth', authRouter);
    app.use('/oauth', oauthRouter);
    app.use('/sessions', sessionsRouter);
    app.use('/clients', clientsRouter);

    // Connect to database
    await getDatabasePool();
    Log.info('Database connection established');

    // Run migrations
    await runMigrations();
    Log.info('Migrations completed');

    // Middleware
    app.use(errorMiddleware);

    // Start server
    app.listen(config.app.port, () => {
      Log.success('HTTP server listening', {
        port: config.app.port,
        healthPath: '/health',
      });
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      Log.warn('SIGTERM received, shutting down');
      await closeDatabasePool();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      Log.warn('SIGINT received, shutting down');
      await closeDatabasePool();
      process.exit(0);
    });
  } catch (error) {
    Log.error('Failed to start application', error);
    process.exit(1);
  }
}

bootstrap();
