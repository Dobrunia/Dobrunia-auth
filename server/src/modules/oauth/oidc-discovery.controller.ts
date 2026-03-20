import { Request, Response } from 'express';
import { config } from '../../config/env.config';
import type { OpenIDConfiguration, JWKS } from '../../types/oidc-discovery.types';
import { SCOPES, GRANT_TYPES } from '../../constants/oauth.constants';

export class OIDCDiscoveryController {
  /**
   * OpenID Connect Discovery endpoint
   * Returns OIDC configuration document
   */
  async discovery(_req: Request, res: Response<OpenIDConfiguration>): Promise<void> {
    const baseUrl = config.app.url;

    const discovery: OpenIDConfiguration = {
      issuer: config.app.issuer,
      authorization_endpoint: `${baseUrl}/oauth/authorize`,
      token_endpoint: `${baseUrl}/oauth/token`,
      userinfo_endpoint: `${baseUrl}/oauth/userinfo`,
      jwks_uri: `${baseUrl}/.well-known/jwks.json`,
      registration_endpoint: `${baseUrl}/oauth/clients`,

      // Supported scopes
      scopes_supported: [
        SCOPES.OPENID,
        SCOPES.PROFILE,
        SCOPES.EMAIL,
        SCOPES.OFFLINE_ACCESS,
      ],

      // Supported response types
      response_types_supported: ['code'], // Authorization Code Flow only
      response_modes_supported: ['query', 'fragment'],

      // Supported grant types
      grant_types_supported: [
        GRANT_TYPES.AUTHORIZATION_CODE,
        GRANT_TYPES.REFRESH_TOKEN,
      ],

      // Subject types (public = no pairwise pseudonyms)
      subject_types_supported: ['public'],

      // ID token signing algorithms
      id_token_signing_alg_values_supported: ['RS256', 'HS256'],

      // Token endpoint auth methods
      token_endpoint_auth_methods_supported: [
        'client_secret_basic',
        'client_secret_post',
      ],

      // Supported claims
      claims_supported: [
        'sub',
        'name',
        'given_name',
        'family_name',
        'middle_name',
        'nickname',
        'preferred_username',
        'profile',
        'picture',
        'website',
        'email',
        'email_verified',
        'gender',
        'birthdate',
        'zoneinfo',
        'locale',
        'phone_number',
        'phone_number_verified',
        'updated_at',
      ],

      // Other supported features
      claims_parameter_supported: false,
      request_parameter_supported: false,
      request_uri_parameter_supported: false,
    };

    res.json(discovery);
  }

  /**
   * JWKS endpoint
   * Returns JSON Web Key Set for token verification
   */
  async jwks(_req: Request, res: Response<JWKS>): Promise<void> {
    // For HS256 (HMAC), we don't expose the key publicly
    // For RS256 (RSA), we would expose the public key here
    
    // Since we're using HS256 for development, return empty keys
    // In production with RS256, this would return the RSA public key
    
    const jwks: JWKS = {
      keys: [
        {
          kty: 'oct', // Octet sequence (symmetric key)
          use: 'sig', // Signature
          kid: 'dobrunia-auth-key-1',
          alg: 'HS256',
          // Note: We don't expose the actual key in JWKS for symmetric keys
          // This is a placeholder - in production with RS256, include the RSA public key
        },
      ],
    };

    res.json(jwks);
  }
}

export const oidcDiscoveryController = new OIDCDiscoveryController();
