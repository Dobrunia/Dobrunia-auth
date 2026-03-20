import { Request, Response } from 'express';
import type { AuthRequest } from '../../shared/auth.middleware';
import { oauthClientsRepository } from '../oauth/oauth-clients.repository';
import { authorizationCodesService } from '../oauth/authorization-codes.service';
import type { AuthorizeQueryParams } from '../../types/oauth-authorize.types';
import { z } from 'zod';
import { SCOPES } from '../../constants/oauth.constants';

const authorizeQuerySchema = z.object({
  client_id: z.string().min(1, 'client_id is required'),
  redirect_uri: z.string().url('redirect_uri must be a valid URL'),
  response_type: z.string().refine((val) => val === 'code', {
    message: 'response_type must be "code"',
  }),
  scope: z.string().optional(),
  state: z.string().optional(),
  code_challenge: z.string().optional(),
  code_challenge_method: z.string().optional().refine(
    (val) => !val || val === 'S256' || val === 'plain',
    { message: 'code_challenge_method must be "S256" or "plain"' }
  ),
});

// Supported scopes set for validation
const SUPPORTED_SCOPES = new Set([
  SCOPES.OPENID,
  SCOPES.PROFILE,
  SCOPES.EMAIL,
  SCOPES.OFFLINE_ACCESS,
]);

export class OAuthAuthorizeController {
  async authorize(req: Request, res: Response): Promise<void> {
    try {
      // Validate query parameters
      const validatedQuery = authorizeQuerySchema.parse(req.query);

      // Find OAuth client
      const client = await oauthClientsRepository.findByClientId(validatedQuery.client_id);

      if (!client) {
        this.redirectWithError(res, validatedQuery.redirect_uri, 'invalid_client', 'Client not found', validatedQuery.state);
        return;
      }

      // Check if client is active
      if (!client.is_active) {
        this.redirectWithError(res, validatedQuery.redirect_uri, 'invalid_client', 'Client is inactive', validatedQuery.state);
        return;
      }

      // Validate redirect_uri (exact match)
      const redirectUris = client.redirect_uris;
      if (!redirectUris.includes(validatedQuery.redirect_uri)) {
        this.redirectWithError(res, validatedQuery.redirect_uri, 'invalid_redirect_uri', 'Redirect URI not registered', validatedQuery.state);
        return;
      }

      // Validate requested scopes against client's allowed scopes
      if (validatedQuery.scope) {
        const requestedScopes = validatedQuery.scope.split(' ');
        const allowedScopes = new Set(client.allowed_scopes);

        for (const scope of requestedScopes) {
          // Check if scope is supported by the server
          if (!SUPPORTED_SCOPES.has(scope as any)) {
            this.redirectWithError(res, validatedQuery.redirect_uri, 'invalid_scope', `Unsupported scope: ${scope}`, validatedQuery.state);
            return;
          }

          // Check if scope is allowed for this client
          if (!allowedScopes.has(scope)) {
            this.redirectWithError(res, validatedQuery.redirect_uri, 'invalid_scope', `Scope not allowed for client: ${scope}`, validatedQuery.state);
            return;
          }
        }
      }

      // Check if user is authenticated
      const authReq = req as AuthRequest;
      if (!authReq.user) {
        // Not authenticated - redirect to login with return URL
        const returnUrl = encodeURIComponent(
          `/oauth/authorize?${new URLSearchParams(req.query as Record<string, string>).toString()}`
        );
        res.redirect(`/login?return_url=${returnUrl}`);
        return;
      }

      // User is authenticated - create authorization code
      const code = await authorizationCodesService.createAuthorizationCode({
        user_id: authReq.user.user_id,
        client_id: client.id,
        redirect_uri: validatedQuery.redirect_uri,
        scope: validatedQuery.scope,
        code_challenge: validatedQuery.code_challenge,
        code_challenge_method: validatedQuery.code_challenge_method,
      });

      // Build redirect URL with code
      const redirectParams = new URLSearchParams({
        code,
      });

      if (validatedQuery.state) {
        redirectParams.set('state', validatedQuery.state);
      }

      res.redirect(`${validatedQuery.redirect_uri}?${redirectParams.toString()}`);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const query = req.query as Record<string, string>;
        const redirectUri = query.redirect_uri || '';
        const state = query.state;
        this.redirectWithError(res, redirectUri, 'invalid_request', error.errors[0].message, state);
        return;
      }

      console.error('OAuth authorize error:', error);
      const query = req.query as Record<string, string>;
      const redirectUri = query.redirect_uri || '';
      const state = query.state;
      this.redirectWithError(res, redirectUri, 'server_error', 'Internal server error', state);
    }
  }

  private redirectWithError(
    res: Response,
    redirectUri: string,
    error: string,
    errorDescription: string,
    state?: string
  ): void {
    if (!redirectUri) {
      res.status(400).json({
        success: false,
        error: {
          code: error,
          message: errorDescription,
        },
      });
      return;
    }

    const redirectParams = new URLSearchParams({
      error,
      error_description: errorDescription,
    });

    if (state) {
      redirectParams.set('state', state);
    }

    res.redirect(`${redirectUri}?${redirectParams.toString()}`);
  }
}

export const oauthAuthorizeController = new OAuthAuthorizeController();
