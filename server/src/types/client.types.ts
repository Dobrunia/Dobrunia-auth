export type ClientId = string;

export interface Client {
  id: ClientId;
  name: string;
  slug: string;
  description: string | null;
  base_url: string | null;
  logo_url: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
