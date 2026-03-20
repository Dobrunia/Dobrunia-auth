import { Request, Response } from 'express';
import { oauthClientsRepository } from '../oauth/oauth-clients.repository';
import { authorizationCodesService } from '../oauth/authorization-codes.service';
import { authService } from '../auth/auth.service';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../tokens/jwt.service';
import { refreshTokensRepository } from '../tokens/refresh-tokens.repository';
import { sessionsRepository } from '../sessions/sessions.repository';
import { hashPassword } from '../../shared/password.utils';
import { z } from 'zod';
import * as crypto from 'crypto';

const authorizationCodeSchema = z.object({
  grant_type: z.literal('authorization_code'),
  code: z.string().min(1, 'code is required'),
  redirect_uri: z.string().url('redirect_uri must be a valid URL'),
  client_id: z.string().min(1, 'client_id is required'),
  client_secret: z.string().optional(),
  code_verifier: z.string().optional(),
});

const refreshTokenSchema = z.object({
  grant_type: z.literal('refresh_token'),
  refresh_token: z.string().min(1, 'refresh_token is required'),
  client_id: z.string().optional(),
  client_secret: z.string().optional(),
});

export class OAuthTokenController {
  async token(req: Request, res: Response): Promise<void> {
    try {
      const grantType = req.body.grant_type;

      if (grantType === 'authorization_code') {
        await this.handleAuthorizationCodeGrant(req, res);
      } else if (grantType === 'refresh_token') {
        await this.handleRefreshTokenGrant(req, res);
      } else {
        res.status(400).json({
          success: false,
          error: {
            error: 'unsupported_grant_type',
            error_description: 'Grant type not supported',
          },
        });
      }
    } catch (error) {
      console.error('OAuth token error:', error);
      res.status(500).json({
        success: false,
        error: {
          error: 'server_error',
          error_description: 'Internal server error',
        },
      });
    }
  }

  private async handleAuthorizationCodeGrant(req: Request, res: Response): Promise<void> {
    try {
      // Validate request
      const validatedBody = authorizationCodeSchema.parse(req.body);

      // Find OAuth client
      const client = await oauthClientsRepository.findByClientId(validatedBody.client_id);

      if (!client) {
        res.status(401).json({
          success: false,
          error: {
            error: 'invalid_client',
            error_description: 'Client not found',
          },
        });
        return;
      }

      // Verify client secret for confidential clients
      if (client.client_secret_hash) {
        if (!validatedBody.client_secret) {
          res.status(401).json({
            success: false,
            error: {
              error: 'invalid_client',
              error_description: 'Client secret required',
            },
          });
          return;
        }

        const isValidSecret = await this.verifyClientSecret(client.client_secret_hash, validatedBody.client_secret);
        if (!isValidSecret) {
          res.status(401).json({
            success: false,
            error: {
              error: 'invalid_client',
              error_description: 'Invalid client secret',
            },
          });
          return;
        }
      }

      // Validate and consume authorization code
      const codeResult = await authorizationCodesService.consumeCode(validatedBody.code);

      if (!codeResult.success) {
        res.status(400).json({
          success: false,
          error: {
            error: 'invalid_grant',
            error_description: codeResult.error,
          },
        });
        return;
      }

      const codeRecord = codeResult.codeRecord!;

      // Verify redirect_uri matches
      if (codeRecord.redirect_uri !== validatedBody.redirect_uri) {
        res.status(400).json({
          success: false,
          error: {
            error: 'invalid_grant',
            error_description: 'Redirect URI mismatch',
          },
        });
        return;
      }

      // Verify PKCE code verifier if code challenge was present
      if (codeRecord.code_challenge) {
        if (!validatedBody.code_verifier) {
          res.status(400).json({
            success: false,
            error: {
              error: 'invalid_grant',
              error_description: 'code_verifier required',
            },
          });
          return;
        }

        const isValidVerifier = await this.verifyCodeVerifier(
          validatedBody.code_verifier,
          codeRecord.code_challenge,
          codeRecord.code_challenge_method || 'S256'
        );

        if (!isValidVerifier) {
          res.status(400).json({
            success: false,
            error: {
              error: 'invalid_grant',
              error_description: 'Invalid code_verifier',
            },
          });
          return;
        }
      }

      // Create session with client context
      const session = await sessionsRepository.create({
        user_id: codeRecord.user_id,
        client_id: client.id,
        service_name: client.name,
        user_agent: req.headers['user-agent'] as string || null,
        ip_address: req.ip || req.socket.remoteAddress || null,
      });

      // Generate tokens
      const access_token = generateAccessToken({
        user_id: codeRecord.user_id,
        session_id: session.id,
        scope: codeRecord.scope || undefined,
        client_id: client.client_id,
      });

      const refreshTokenPlain = generateRefreshToken();
      const refreshTokenHash = await hashPassword(refreshTokenPlain);

      // Store refresh token
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      await refreshTokensRepository.create({
        user_id: codeRecord.user_id,
        session_id: session.id,
        token_hash: refreshTokenHash,
        expires_at: expiresAt,
      });

      // Return tokens
      res.json({
        success: true,
        data: {
          access_token,
          token_type: 'Bearer' as const,
          expires_in: 900, // 15 minutes
          refresh_token: refreshTokenPlain,
          scope: codeRecord.scope || undefined,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: {
            error: 'invalid_request',
            error_description: error.errors[0].message,
          },
        });
        return;
      }

      throw error;
    }
  }

  private async handleRefreshTokenGrant(req: Request, res: Response): Promise<void> {
    try {
      // Validate request
      const validatedBody = refreshTokenSchema.parse(req.body);

      // Use existing refresh logic from authService
      const result = await authService.refresh(validatedBody.refresh_token);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: {
            error: 'invalid_request',
            error_description: error.errors[0].message,
          },
        });
        return;
      }

      if (error instanceof Error && error.message.includes('refresh token')) {
        res.status(400).json({
          success: false,
          error: {
            error: 'invalid_grant',
            error_description: error.message,
          },
        });
        return;
      }

      throw error;
    }
  }

  private async verifyClientSecret(storedHash: string, providedSecret: string): Promise<boolean> {
    const providedHash = await hashPassword(providedSecret);
    return storedHash === providedHash;
  }

  private async verifyCodeVerifier(
    verifier: string,
    challenge: string,
    method: string
  ): Promise<boolean> {
    if (method === 'S256') {
      const hash = crypto.createHash('sha256').update(verifier).digest('base64url');
      return hash === challenge;
    } else if (method === 'plain') {
      return verifier === challenge;
    }
    return false;
  }
}

export const oauthTokenController = new OAuthTokenController();
