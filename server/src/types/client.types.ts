export type ClientId = string;

/** Строка из SELECT по таблице `clients` (узкий набор полей). */
export interface ClientRow {
  id: string;
  slug: string;
  name: string;
}

/** Клиент + список точных redirect_uri для OAuth (из JSON колонки). */
export interface ClientRowWithOAuth {
  id: string;
  slug: string;
  name: string;
  oauthRedirectUris: string[];
}

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
