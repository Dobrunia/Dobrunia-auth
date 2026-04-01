export interface AuthTokensResponse {
  user: { id: string; email: string };
  session: { id: string; clientId: string; clientSlug: string };
  accessToken: string;
  refreshToken: string;
}

export interface SessionItem {
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
