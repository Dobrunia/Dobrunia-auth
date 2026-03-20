import { authorizationCodesRepository } from './authorization-codes.repository';
import { hashPassword, verifyPassword } from '../../shared/password.utils';
import { TOKEN_TTL } from '../../constants/auth.constants';
import type { AuthorizationCode } from '../../types/authorization-code.types';
import * as crypto from 'crypto';

export interface AuthorizationCodeData {
  code: string; // plain text code to return
  code_hash: string; // hashed code for storage
}

export interface AuthorizationCodeCreateData {
  user_id: number;
  client_id: number;
  redirect_uri: string;
  scope?: string;
  code_challenge?: string;
  code_challenge_method?: string;
}

export class AuthorizationCodesService {
  generateCode(): AuthorizationCodeData {
    // Generate cryptographically secure random code
    const code = crypto.randomBytes(32).toString('hex');
    return {
      code,
      code_hash: crypto.createHash('sha256').update(code).digest('hex'),
    };
  }

  async createAuthorizationCode(data: AuthorizationCodeCreateData): Promise<string> {
    // Generate code
    const { code, code_hash } = this.generateCode();

    // Set expiration (10 minutes)
    const expiresAt = new Date();
    const ttlMatch = TOKEN_TTL.AUTHORIZATION_CODE.match(/^(\d+)([mhd])$/);
    if (ttlMatch) {
      const value = parseInt(ttlMatch[1], 10);
      const unit = ttlMatch[2];
      if (unit === 'm') {
        expiresAt.setMinutes(expiresAt.getMinutes() + value);
      } else if (unit === 'h') {
        expiresAt.setHours(expiresAt.getHours() + value);
      } else if (unit === 'd') {
        expiresAt.setDate(expiresAt.getDate() + value);
      }
    }

    // Store code
    await authorizationCodesRepository.create({
      code_hash,
      user_id: data.user_id,
      client_id: data.client_id,
      redirect_uri: data.redirect_uri,
      scope: data.scope ?? null,
      code_challenge: data.code_challenge ?? null,
      code_challenge_method: data.code_challenge_method ?? null,
      expires_at: expiresAt,
    });

    // Return plain code (never store it)
    return code;
  }

  async validateCode(code: string): Promise<{
    valid: boolean;
    codeRecord?: AuthorizationCode;
    error?: string;
  }> {
    // Hash the provided code
    const code_hash = crypto.createHash('sha256').update(code).digest('hex');

    // Find code in database
    const codeRecord = await authorizationCodesRepository.findByCodeHash(code_hash);

    if (!codeRecord) {
      return {
        valid: false,
        error: 'Authorization code not found',
      };
    }

    // Check if already used
    if (codeRecord.used_at) {
      return {
        valid: false,
        error: 'Authorization code has already been used',
      };
    }

    // Check if expired
    if (codeRecord.expires_at < new Date()) {
      return {
        valid: false,
        error: 'Authorization code has expired',
      };
    }

    return {
      valid: true,
      codeRecord,
    };
  }

  async consumeCode(code: string): Promise<{
    success: boolean;
    codeRecord?: AuthorizationCode;
    error?: string;
  }> {
    // Validate code first
    const validation = await this.validateCode(code);

    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
      };
    }

    // Mark as used
    await authorizationCodesRepository.markAsUsed(validation.codeRecord!.id);

    return {
      success: true,
      codeRecord: validation.codeRecord,
    };
  }
}

export const authorizationCodesService = new AuthorizationCodesService();
