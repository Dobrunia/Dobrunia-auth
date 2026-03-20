import { usersRepository } from '../users/users.repository';
import { sessionsRepository } from '../sessions/sessions.repository';
import { refreshTokensRepository } from '../tokens/refresh-tokens.repository';
import { hashPassword, verifyPassword } from '../../shared/password.utils';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../tokens/jwt.service';
import type { RegisterInput } from '../../shared/schemas';
import type { LoginInput } from '../../shared/schemas';

export class AuthService {
  async register(input: RegisterInput) {
    // Check if email already exists
    const existingUser = await usersRepository.findByEmail(input.email);
    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Hash password
    const password_hash = await hashPassword(input.password);

    // Create user
    const user = await usersRepository.create({
      email: input.email,
      password_hash,
    });

    return {
      id: user.id,
      email: user.email,
      email_verified: user.email_verified,
      name: user.name,
      avatar: user.avatar,
      status: user.status,
      created_at: user.created_at,
    };
  }

  async login(input: LoginInput, userAgent?: string, ipAddress?: string, clientId?: string) {
    // Find user by email
    const user = await usersRepository.findByEmail(input.email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isValidPassword = await verifyPassword(user.password_hash, input.password);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Check user status
    if (user.status !== 'active') {
      throw new Error('Account is inactive');
    }

    // Get service name if client_id provided
    let serviceName: string | null = null;
    if (clientId) {
      const client = await oauthClientsRepository.findByClientId(clientId);
      serviceName = client?.name || null;
    }

    // Create session with client context
    const session = await sessionsRepository.create({
      user_id: user.id,
      client_id: clientId ? (await oauthClientsRepository.findByClientId(clientId))?.id || null : null,
      service_name: serviceName,
      user_agent: userAgent ?? null,
      ip_address: ipAddress ?? null,
    });

    // Generate tokens
    const access_token = generateAccessToken({
      user_id: user.id,
      session_id: session.id,
      client_id: clientId,
    });

    const refreshTokenPlain = generateRefreshToken();
    const refresh_token_hash = await hashPassword(refreshTokenPlain);

    // Store refresh token in database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    await refreshTokensRepository.create({
      user_id: user.id,
      session_id: session.id,
      token_hash: refresh_token_hash,
      expires_at: expiresAt,
    });

    return {
      access_token,
      refresh_token: refreshTokenPlain,
      user: {
        id: user.id,
        email: user.email,
        email_verified: user.email_verified,
        name: user.name,
        avatar: user.avatar,
      },
    };
  }

  async refresh(refreshTokenPlain: string) {
    // Verify refresh token signature
    let refreshPayload: { jti: string };
    try {
      refreshPayload = verifyRefreshToken(refreshTokenPlain);
    } catch (error) {
      throw new Error('Invalid refresh token');
    }

    // Find refresh token in database by iterating through possible tokens
    // In production, you'd store the jti in the token and look it up directly
    // For now, we'll verify the hash matches
    const allTokens = await refreshTokensRepository.findAllActive();
    
    const tokenRecord = allTokens.find(async (t) => {
      const isValid = await verifyPassword(t.token_hash, refreshTokenPlain);
      return isValid;
    });

    if (!tokenRecord) {
      throw new Error('Refresh token not found');
    }

    const token = await tokenRecord;
    if (!token) {
      throw new Error('Refresh token not found');
    }

    // Check if token is revoked
    if (token.revoked_at) {
      throw new Error('Refresh token has been revoked');
    }

    // Check if token is expired
    if (token.expires_at < new Date()) {
      throw new Error('Refresh token has expired');
    }

    // Verify session is still active
    const session = await sessionsRepository.findById(token.session_id);
    if (!session || session.revoked_at) {
      throw new Error('Session is no longer active');
    }

    // Revoke old refresh token (rotation)
    await refreshTokensRepository.revoke(token.id);

    // Generate new refresh token
    const newRefreshTokenPlain = generateRefreshToken();
    const newRefreshTokenHash = await hashPassword(newRefreshTokenPlain);

    // Generate new access token
    const access_token = generateAccessToken({
      user_id: token.user_id,
      session_id: token.session_id,
    });

    // Store new refresh token
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 30);

    await refreshTokensRepository.create({
      user_id: token.user_id,
      session_id: token.session_id,
      token_hash: newRefreshTokenHash,
      expires_at: newExpiresAt,
    });

    return {
      access_token,
      refresh_token: newRefreshTokenPlain,
    };
  }

  async logout(userId: number, sessionId: number) {
    // Revoke session
    await sessionsRepository.revoke(sessionId);

    // Revoke all refresh tokens for this session
    await refreshTokensRepository.revokeAllForSession(sessionId);

    return {
      success: true,
      message: 'Successfully logged out',
    };
  }

  async logoutAll(userId: number) {
    // Revoke all sessions for user
    await sessionsRepository.revokeAllForUser(userId);

    // Revoke all refresh tokens for user
    await refreshTokensRepository.revokeAllForUser(userId);

    return {
      success: true,
      message: 'Successfully logged out from all sessions',
    };
  }
}

export const authService = new AuthService();
