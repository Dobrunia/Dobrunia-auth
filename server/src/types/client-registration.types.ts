export interface RegisteredClientDto {
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

export interface RegisterClientParams {
  id: string;
  ownerUserId: string;
  name: string;
  slug: string;
  description: string | null;
  baseUrl: string | null;
  logoUrl: string | null;
  redirectUris: string[];
  createdAt: Date;
}

export interface UpdateClientParams {
  name: string;
  slug: string;
  description: string | null;
  baseUrl: string | null;
  logoUrl: string | null;
  redirectUris: string[];
  isActive: boolean;
}

export interface ManagedClientSessionDto {
  id: string;
  userId: string;
  userEmail: string;
  userDisplayName: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  lastSeenAt: string | null;
  createdAt: string;
}
