export interface RegisteredClientDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  baseUrl: string | null;
  logoUrl: string | null;
  redirectUris: string[];
  isActive: boolean;
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
