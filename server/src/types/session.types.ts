/**
 * Session entity types
 */

export interface Session {
  id: number;
  user_id: number;
  user_agent: string | null;
  ip_address: string | null;
  created_at: Date;
  last_seen_at: Date;
  revoked_at: Date | null;
}

export interface SessionCreateInput {
  user_id: number;
  user_agent?: string | null;
  ip_address?: string | null;
}

export interface SessionWithUser extends Session {
  user?: {
    id: number;
    email: string;
    name: string | null;
  };
}
