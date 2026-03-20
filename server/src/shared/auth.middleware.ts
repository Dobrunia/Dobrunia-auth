import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, type JwtPayload } from '../modules/tokens/jwt.service';

export interface AuthRequest extends Request {
  user?: {
    user_id: number;
    session_id: number;
  };
}

export function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authorization header required',
        },
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const payload = verifyAccessToken(token);

    // Attach user info to request
    req.user = {
      user_id: payload.sub,
      session_id: payload.session_id!,
    };

    next();
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'TokenExpiredError') {
        res.status(401).json({
          success: false,
          error: {
            code: 'TOKEN_EXPIRED',
            message: 'Access token has expired',
          },
        });
        return;
      }

      if (error.name === 'JsonWebTokenError') {
        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid access token',
          },
        });
        return;
      }
    }

    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or missing authorization token',
      },
    });
  }
}
