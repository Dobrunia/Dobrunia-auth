import { usersRepository } from '../users/users.repository';
import { emailVerificationTokensRepository } from './email-verification-tokens.repository';
import { hashPassword, verifyPassword } from '../../shared/password.utils';
import { TOKEN_TTL } from '../../constants/auth.constants';
import * as crypto from 'crypto';

export class EmailVerificationService {
  async sendVerificationEmail(userId: number, userEmail: string): Promise<string> {
    // Generate random token
    const token = crypto.randomBytes(32).toString('hex');
    const token_hash = await hashPassword(token);

    // Set expiration (24 hours)
    const expiresAt = new Date();
    const ttlMatch = TOKEN_TTL.EMAIL_VERIFICATION.match(/^(\d+)([hdm])$/);
    if (ttlMatch) {
      const value = parseInt(ttlMatch[1], 10);
      const unit = ttlMatch[2];
      if (unit === 'h') {
        expiresAt.setHours(expiresAt.getHours() + value);
      } else if (unit === 'd') {
        expiresAt.setDate(expiresAt.getDate() + value);
      }
    }

    // Delete any existing tokens for this user
    await emailVerificationTokensRepository.deleteForUser(userId);

    // Store new token
    await emailVerificationTokensRepository.create({
      user_id: userId,
      token_hash,
      expires_at: expiresAt,
    });

    // In production, send email here
    // For now, just log the token (for testing)
    console.log(`Email verification token for ${userEmail}: ${token}`);
    
    return token;
  }

  async verifyEmail(token: string): Promise<{ success: boolean; message: string }> {
    // Get all active tokens and check each one
    const allTokens = await emailVerificationTokensRepository.findAllActive();
    
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
        message: 'Invalid verification token',
      };
    }

    // Check if already used
    if (matchingToken.used_at) {
      return {
        success: false,
        message: 'Verification token has already been used',
      };
    }

    // Check if expired
    if (matchingToken.expires_at < new Date()) {
      return {
        success: false,
        message: 'Verification token has expired',
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

    // Mark email as verified
    await usersRepository.updateEmailVerified(user.email, true);

    // Mark token as used
    await emailVerificationTokensRepository.markAsUsed(matchingToken.id);

    return {
      success: true,
      message: 'Email verified successfully',
    };
  }
}

export const emailVerificationService = new EmailVerificationService();
