export interface RegisteredClient {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  baseUrl: string | null;
  logoUrl: string | null;
  redirectUris: string[];
  isActive: boolean;
  activeSessionCount: number;
  activeUserCount: number;
  createdAt: string;
}

export interface RegisterClientBody {
  name: string;
  slug: string;
  description?: string;
  baseUrl?: string;
  logoUrl?: string;
  redirectUris: string[];
}

export interface UpdateClientBody {
  name?: string;
  slug?: string;
  description?: string;
  baseUrl?: string;
  logoUrl?: string;
  redirectUris?: string[];
  isActive?: boolean;
}

export interface ManagedClientSession {
  id: string;
  userId: string;
  userEmail: string;
  userDisplayName: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  lastSeenAt: string | null;
  createdAt: string;
}
