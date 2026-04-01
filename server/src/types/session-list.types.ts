/** Строка из listSessions* JOIN clients */
export interface SessionListRow {
  id: string;
  user_id: string;
  client_id: string;
  status: string;
  ip_address: string | null;
  user_agent: string | null;
  last_seen_at: Date | string | null;
  created_at: Date | string;
  revoked_at: Date | string | null;
  revoke_reason: string | null;
  client_slug: string;
  client_name: string;
}

export interface SessionListItemDto {
  id: string;
  status: string;
  clientId: string;
  clientSlug: string;
  clientName: string;
  ipAddress: string | null;
  userAgent: string | null;
  lastSeenAt: string | null;
  createdAt: string;
  revokedAt: string | null;
  revokeReason: string | null;
}

export interface SessionListResponse {
  sessions: SessionListItemDto[];
}
