import { usersRepository } from '../users/users.repository';
import { sessionsRepository } from '../sessions/sessions.repository';
import { refreshTokensRepository } from '../tokens/refresh-tokens.repository';
import { passwordResetTokensRepository } from './password-reset-tokens.repository';
import { hashPassword, verifyPassword } from '../../shared/password.utils';
import { TOKEN_TTL } from '../../constants/auth.constants';
import * as crypto from 'crypto';

export class PasswordResetService {
  async forgotPassword(userEmail: string): Promise<{ success: boolean; message: string }> {
    // Find user by email
    const user = await usersRepository.findByEmail(userEmail);

    // Don't reveal if user exists (security)
    if (!user) {
      return {
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent',
      };
    }

    // Generate random token
    const token = crypto.randomBytes(32).toString('hex');
    const token_hash = await hashPassword(token);

    // Set expiration (1 hour)
    const expiresAt = new Date();
    const ttlMatch = TOKEN_TTL.PASSWORD_RESET.match(/^(\d+)([hdm])$/);
    if (ttlMatch) {
      const value = parseInt(ttlMatch[1], 10);
      const unit = ttlMatch[2];
      if (unit === 'h') {
        expiresAt.setHours(expiresAt.getHours() + value);
      } else if (unit === 'd') {
        expiresAt.setDate(expiresAt.getDate() + value);
      }
    }

    // Delete any existing reset tokens for this user
    await passwordResetTokensRepository.deleteForUser(user.id);

    // Store new token
    await passwordResetTokensRepository.create({
      user_id: user.id,
      token_hash,
      expires_at: expiresAt,
    });

    // In production, send email here
    // For now, just log the token (for testing)
    console.log(`Password reset token for ${userEmail}: ${token}`);

    return {
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent',
    };
  }

  async resetPassword(
    token: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    // Get all active tokens and check each one
    const allTokens = await passwordResetTokensRepository.findAllActive();

    // Find matching token by verifying password hash
    let matchingToken: typeof allTokens[number] | undefined;
    for (const tokenRecord of allTokens) {
      const isValid = await verifyPassword(tokenRecord.token_hash, token);
      if (isValid) {
        matchingToken = tokenRecord;
        break;
      }
    }

    if (!matchingToken) {
      return {
        success: false,
        message: 'Invalid reset token',
      };
    }

    // Check if already used
    if (matchingToken.used_at) {
      return {
        success: false,
        message: 'Reset token has already been used',
      };
    }

    // Check if expired
    if (matchingToken.expires_at < new Date()) {
      return {
        success: false,
        message: 'Reset token has expired',
      };
    }

    // Get user
    const user = await usersRepository.findById(matchingToken.user_id);

    if (!user) {
      return {
        success: false,
        message: 'User not found',
      };
    }

    // Hash new password
    const new_password_hash = await hashPassword(newPassword);

    // Update user password
    await usersRepository.update(user.id, { password_hash: new_password_hash } as any);

    // Revoke all sessions for security
    await sessionsRepository.revokeAllForUser(user.id);
    await refreshTokensRepository.revokeAllForUser(user.id);

    // Mark token as used
    await passwordResetTokensRepository.markAsUsed(matchingToken.id);

    return {
      success: true,
      message: 'Password has been reset successfully',
    };
  }
}

export const passwordResetService = new PasswordResetService();
