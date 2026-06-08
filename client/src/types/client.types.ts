export interface RegisteredClient {
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

export interface RegisterClientBody {
  name: string;
  slug: string;
  description?: string;
  baseUrl?: string;
  logoUrl?: string;
  redirectUris: string[];
}
