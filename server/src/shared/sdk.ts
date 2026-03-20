/**
 * Server-side SDK helpers for Dobrunia Auth
 */

export interface JwtPayload {
  sub: number;
  iss?: string;
  aud?: string;
  exp?: number;
  iat?: number;
  scope?: string;
  client_id?: string;
  session_id?: number;
}

export interface ServiceConfig {
  name: string;
  version?: string;
  iconUrl?: string;
}

export interface AuthMiddlewareOptions {
  authServerUrl: string;
  service?: ServiceConfig;  // Service identification
  autoReportActivity?: boolean;  // Automatic activity reporting
  activityIntervalMs?: number;  // Heartbeat interval (default: 5 min)
}

export interface TokenValidationResult {
  valid: boolean;
  payload?: JwtPayload;
  error?: string;
}

export interface UserInfo {
  sub: string;
  name?: string | null;
  email?: string | null;
  email_verified?: boolean;
  picture?: string | null;
}

export interface ActiveService {
  client_id: number;
  service_name: string;
  last_active: Date;
  session_count: number;
}

/**
 * Create Express middleware for token validation with service identification
 */
export function createAuthMiddleware(options: AuthMiddlewareOptions) {
  let activityTimer: ReturnType<typeof setInterval> | null = null;

  // Start automatic activity reporting if enabled
  if (options.autoReportActivity && options.service) {
    activityTimer = setInterval(() => {
      reportActivity(options.authServerUrl, options.service!.name)
        .catch(err => console.error('Activity report failed:', err));
    }, options.activityIntervalMs || 5 * 60 * 1000); // Default 5 minutes
  }

  return async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authorization header required',
        },
      });
    }

    const token = authHeader.substring(7);
    const result = await validateToken(token, options.authServerUrl);

    if (!result.valid) {
      return res.status(401).json({
        success: false,
        error: {
          code: result.error === 'TOKEN_EXPIRED' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
          message: result.error || 'Invalid token',
        },
      });
    }

    // Attach service info if configured
    if (options.service) {
      req.service = options.service;
      // Include service info in request for downstream use
      req.body.client_id = options.service.name;
    }

    req.user = result.payload;
    next();
  };
}

/**
 * Report activity to auth server
 */
async function reportActivity(authServerUrl: string, serviceName: string): Promise<void> {
  try {
    // This could be expanded to actually hit an endpoint
    // For now, it's a placeholder for future activity tracking
    console.log(`[Activity Report] ${serviceName} is active`);
  } catch (error) {
    console.error('Activity report error:', error);
  }
}

/**
 * Validate JWT token with auth server
 */
export async function validateToken(
  token: string,
  authServerUrl: string
): Promise<TokenValidationResult> {
  try {
    const response = await fetch(`${authServerUrl}/oauth/userinfo`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 401) {
      return {
        valid: false,
        error: 'TOKEN_EXPIRED',
      };
    }

    if (!response.ok) {
      return {
        valid: false,
        error: 'INVALID_TOKEN',
      };
    }

    const userInfo = await response.json() as UserInfo;

    return {
      valid: true,
      payload: {
        sub: parseInt(userInfo.sub),
        ...userInfo,
      } as JwtPayload,
    };
  } catch (error) {
    return {
      valid: false,
      error: 'VALIDATION_ERROR',
    };
  }
}

/**
 * Get active services for current user
 */
export async function getActiveServices(
  authServerUrl: string,
  token: string
): Promise<ActiveService[] | null> {
  try {
    const response = await fetch(`${authServerUrl}/me/active-services`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json() as { data: ActiveService[] };
    return data.data;
  } catch (error) {
    return null;
  }
}

/**
 * Logout from specific service
 */
export async function logoutFromService(
  authServerUrl: string,
  token: string,
  clientId: number
): Promise<boolean> {
  try {
    const response = await fetch(`${authServerUrl}/me/sessions/by-client/${clientId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Get all sessions grouped by service
 */
export async function getSessionsByClient(
  authServerUrl: string,
  token: string
): Promise<any[] | null> {
  try {
    const response = await fetch(`${authServerUrl}/me/sessions/by-client`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    return null;
  }
}

/**
 * Revoke token
 */
export async function revokeToken(
  token: string,
  authServerUrl: string,
  clientId: string,
  clientSecret: string
): Promise<boolean> {
  try {
    const response = await fetch(`${authServerUrl}/oauth/revoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    return response.ok;
  } catch (error) {
    return false;
  }
}
