import express from 'express';
import { config } from './config';
import { getDatabasePool, closeDatabasePool } from './db/database';
import { runMigrations } from './db/migrate';
import { healthRouter } from './modules/health';
import { authRouter } from './modules/auth';
import { usersRouter } from './modules/users';
import { emailVerificationRouter } from './modules/email/email-verification.router';
import { passwordResetRouter } from './modules/email/password-reset.router';
import { oauthClientsRouter } from './modules/clients/oauth-clients.router';
import { oauthAuthorizeRouter } from './modules/oauth/oauth-authorize.router';
import { oauthTokenRouter } from './modules/oauth/oauth-token.router';
import { oauthUserInfoRouter } from './modules/oauth/oauth-userinfo.router';
import { oidcDiscoveryRouter } from './modules/oauth/oidc-discovery.router';
import { oauthRevokeRouter } from './modules/oauth/oauth-revoke.router';
import { signingKeysRouter } from './modules/tokens/signing-keys.router';

async function bootstrap(): Promise<void> {
  try {
    // Create Express app
    const app = express();

    // Middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Routes
    app.use(healthRouter);
    console.log('Health endpoint registered');

    app.use(authRouter);
    console.log('Auth endpoints registered');

    app.use(usersRouter);
    console.log('Users endpoints registered');

    app.use(emailVerificationRouter);
    console.log('Email verification endpoints registered');

    app.use(passwordResetRouter);
    console.log('Password reset endpoints registered');

    app.use(oauthClientsRouter);
    console.log('OAuth clients admin endpoints registered');

    app.use(oauthAuthorizeRouter);
    console.log('OAuth authorize endpoint registered');

    app.use(oauthTokenRouter);
    console.log('OAuth token endpoint registered');

    app.use(oauthUserInfoRouter);
    console.log('OAuth userinfo endpoint registered');

    app.use(oidcDiscoveryRouter);
    console.log('OIDC discovery endpoints registered');

    app.use(oauthRevokeRouter);
    console.log('OAuth revoke endpoint registered');

    app.use(signingKeysRouter);
    console.log('Signing keys admin endpoints registered');

    // Connect to database
    await getDatabasePool();
    console.log('Database connection established');

    // Run migrations
    await runMigrations();
    console.log('Migrations completed');

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
