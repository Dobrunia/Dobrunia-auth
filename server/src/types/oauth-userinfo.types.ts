/**
 * OpenID Connect UserInfo endpoint types
 * Based on OIDC standard claims
 */

export interface UserInfoResponse {
  sub: string; // Subject identifier (user id)
  name?: string | null;
  given_name?: string | null;
  family_name?: string | null;
  middle_name?: string | null;
  nickname?: string | null;
  preferred_username?: string | null;
  profile?: string | null;
  picture?: string | null;
  website?: string | null;
  email?: string | null;
  email_verified?: boolean;
  gender?: string | null;
  birthdate?: string | null;
  zoneinfo?: string | null;
  locale?: string | null;
  phone_number?: string | null;
  phone_number_verified?: boolean;
  address?: {
    formatted?: string;
    street_address?: string;
    locality?: string;
    region?: string;
    postal_code?: string;
    country?: string;
  };
  updated_at?: number;
}

export interface UserInfoError {
  error: string;
  error_description?: string;
}
