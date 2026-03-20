import { Router } from 'express';
import { oidcDiscoveryController } from './oidc-discovery.controller';

export const oidcDiscoveryRouter = Router();

// OpenID Connect Discovery endpoint
oidcDiscoveryRouter.get(
  '/.well-known/openid-configuration',
  (req, res) => oidcDiscoveryController.discovery(req, res)
);

// JWKS endpoint
oidcDiscoveryRouter.get(
  '/.well-known/jwks.json',
  (req, res) => oidcDiscoveryController.jwks(req, res)
);
