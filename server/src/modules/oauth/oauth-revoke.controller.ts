import { Request, Response } from 'express';
import { oauthClientsRepository } from '../oauth/oauth-clients.repository';
import { refreshTokensRepository } from '../tokens/refresh-tokens.repository';
import { hashPassword } from '../../shared/password.utils';
import { z } from 'zod';

const revokeSchema = z.object({
  token: z.string().min(1, 'token is required'),
  token_type_hint: z.enum(['access_token', 'refresh_token']).optional(),
  client_id: z.string().min(1, 'client_id is required'),
  client_secret: z.string().min(1, 'client_secret is required'),
});

export class OAuthRevokeController {
  async revoke(req: Request, res: Response): Promise<void> {
    try {
      // Validate request
      const validatedBody = revokeSchema.parse(req.body);

      // Find and verify OAuth client
      const client = await oauthClientsRepository.findByClientId(validatedBody.client_id);

      if (!client) {
        // RFC 7009: Return success even if client doesn't exist (prevent enumeration)
        res.status(200).json({ success: true });
        return;
      }

      // Verify client secret
      if (!client.client_secret_hash) {
        res.status(401).json({
          success: false,
          error: {
            error: 'invalid_client',
            error_description: 'Client is public and cannot authenticate',
          },
        });
        return;
      }

      const isValidSecret = await this.verifyClientSecret(
        client.client_secret_hash,
        validatedBody.client_secret
      );

      if (!isValidSecret) {
        res.status(401).json({
          success: false,
          error: {
            error: 'invalid_client',
            error_description: 'Invalid client credentials',
          },
        });
        return;
      }

      // Revoke token based on type hint
      const tokenType = validatedBody.token_type_hint;

      if (tokenType === 'refresh_token' || !tokenType) {
        // Try to revoke as refresh token
        const revoked = await this.revokeRefreshToken(validatedBody.token);
        if (revoked) {
          res.status(200).json({ success: true });
          return;
        }
      }

      if (tokenType === 'access_token' || !tokenType) {
        // Access tokens are JWT and stateless
        // We can't directly revoke them without a blacklist
        // For now, we just invalidate the refresh token chain
        // The access token will expire naturally (short TTL)
        
        // In production, you could:
        // 1. Add token to a blacklist (Redis/DB)
        // 2. Increment a session version and check in middleware
        // 3. Use short-lived access tokens (15 min)
        
        // For MVP, we acknowledge the revocation request
        res.status(200).json({ 
          success: true,
          note: 'Access token will expire naturally. Revoke refresh token to prevent renewal.'
        });
        return;
      }

      // Token not found - RFC 7009 says return success anyway
      res.status(200).json({ success: true });
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

      console.error('Revoke error:', error);
      res.status(500).json({
        success: false,
        error: {
          error: 'server_error',
          error_description: 'Internal server error',
        },
      });
    }
  }

  private async verifyClientSecret(storedHash: string, providedSecret: string): Promise<boolean> {
    const providedHash = await hashPassword(providedSecret);
    return storedHash === providedHash;
  }

  private async revokeRefreshToken(token: string): Promise<boolean> {
    // Find refresh token by iterating through active tokens
    // In production, you'd store the token ID or use a different lookup strategy
    const allTokens = await refreshTokensRepository.findAllActive();

    for (const tokenRecord of allTokens) {
      const isValid = await this.verifyTokenHash(tokenRecord.token_hash, token);
      if (isValid) {
        // Revoke this token
        await refreshTokensRepository.revoke(tokenRecord.id);
        return true;
      }
    }

    return false;
  }

  private async verifyTokenHash(storedHash: string, providedToken: string): Promise<boolean> {
    // Refresh tokens are stored as argon2 hashes
    const { verifyPassword } = await import('../../shared/password.utils');
    return verifyPassword(storedHash, providedToken);
  }
}

export const oauthRevokeController = new OAuthRevokeController();
