import { usersRepository } from '../users/users.repository';
import { sessionsRepository } from '../sessions/sessions.repository';
import { refreshTokensRepository } from '../tokens/refresh-tokens.repository';
import { hashPassword, verifyPassword } from '../../shared/password.utils';
import { generateAccessToken, generateRefreshToken } from '../tokens/jwt.service';
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

  async login(input: LoginInput, userAgent?: string, ipAddress?: string) {
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

    // Create session
    const session = await sessionsRepository.create({
      user_id: user.id,
      user_agent: userAgent ?? null,
      ip_address: ipAddress ?? null,
    });

    // Generate tokens
    const access_token = generateAccessToken({
      user_id: user.id,
      session_id: session.id,
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
}

export const authService = new AuthService();
