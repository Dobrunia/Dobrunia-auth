/**
 * OpenID Connect Discovery types
 */

export interface OpenIDConfiguration {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  jwks_uri: string;
  registration_endpoint?: string;
  scopes_supported: string[];
  response_types_supported: string[];
  response_modes_supported: string[];
  grant_types_supported: string[];
  acr_values_supported?: string[];
  subject_types_supported: string[];
  id_token_signing_alg_values_supported: string[];
  id_token_encryption_alg_values_supported?: string[];
  id_token_encryption_enc_values_supported?: string[];
  userinfo_signing_alg_values_supported?: string[];
  userinfo_encryption_alg_values_supported?: string[];
  userinfo_encryption_enc_values_supported?: string[];
  request_object_signing_alg_values_supported?: string[];
  request_object_encryption_alg_values_supported?: string[];
  request_object_encryption_enc_values_supported?: string[];
  token_endpoint_auth_methods_supported: string[];
  token_endpoint_auth_signing_alg_values_supported?: string[];
  display_values_supported?: string[];
  claim_types_supported?: string[];
  claims_supported: string[];
  service_documentation?: string;
  claims_locales_supported?: string[];
  ui_locales_supported?: string[];
  claims_parameter_supported: boolean;
  request_parameter_supported?: boolean;
  request_uri_parameter_supported?: boolean;
  require_request_uri_registration?: boolean;
  op_policy_uri?: string;
  op_tos_uri?: string;
}

/**
 * JWKS (JSON Web Key Set) types
 */

export interface JWK {
  kty: string; // Key type (RSA, EC, oct)
  use?: string; // Use (sig, enc)
  kid: string; // Key ID
  alg?: string; // Algorithm
  n?: string; // Modulus (RSA)
  e?: string; // Exponent (RSA)
  d?: string; // Private exponent (RSA, private keys only)
  p?: string; // Prime factor (RSA)
  q?: string; // Prime factor (RSA)
  dp?: string; // CRT exponent (RSA)
  dq?: string; // CRT coefficient (RSA)
  qi?: string; // CRT coefficient (RSA)
  crv?: string; // Curve (EC)
  x?: string; // X coordinate (EC)
  y?: string; // Y coordinate (EC)
  k?: string; // Key value (oct)
}

export interface JWKS {
  keys: JWK[];
}
