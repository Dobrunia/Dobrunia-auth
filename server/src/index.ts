import express from 'express';
import { config } from './config';
import { getDatabasePool, closeDatabasePool } from './db/database';
import { runMigrations } from './db/migrate';
import { healthRouter } from './modules/health/health.routes';
import { errorMiddleware } from './middleware/error.middleware';

async function bootstrap(): Promise<void> {
  try {
    // Create Express app
    const app = express();

    // Middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Routes
    app.use('/health', healthRouter);

    // Connect to database
    await getDatabasePool();
    console.log('Database connection established');

    // Run migrations
    await runMigrations();
    console.log('Migrations completed');

    // Middleware
    app.use(errorMiddleware);

    // Start server
    app.listen(config.app.port, () => {
      console.log(`Server is running on port ${config.app.port}`);
      console.log(`Health check: http://localhost:${config.app.port}/health`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, shutting down gracefully');
      await closeDatabasePool();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('SIGINT received, shutting down gracefully');
      await closeDatabasePool();
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

bootstrap();
