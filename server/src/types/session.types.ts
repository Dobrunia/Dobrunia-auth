/**
 * Session entity types
 */

export interface Session {
  id: number;
  user_id: number;
  client_id: number | null;
  service_name: string | null;
  user_agent: string | null;
  ip_address: string | null;
  created_at: Date;
  last_seen_at: Date;
  revoked_at: Date | null;
}

export interface SessionCreateInput {
  user_id: number;
  client_id?: number | null;
  service_name?: string | null;
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

export interface SessionGroupedByClient {
  client_id: number | string;
  service_name: string;
  sessions: Session[];
  last_active?: Date;
  session_count: number;
}
