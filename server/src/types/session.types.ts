import type { ClientId } from './client.types';
import type { UserId } from './user.types';

export type SessionId = string;

/** Values stored in `sessions.status` */
export type SessionStatus = 'active' | 'revoked' | 'expired';

export interface Session {
  id: SessionId;
  user_id: UserId;
  client_id: ClientId;
  status: SessionStatus;
  device_name: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  ip_address: string | null;
  user_agent: string | null;
  country: string | null;
  city: string | null;
  last_seen_at: Date | null;
  expires_at: Date | null;
  revoked_at: Date | null;
  revoke_reason: string | null;
  created_at: Date;
  updated_at: Date;
}
