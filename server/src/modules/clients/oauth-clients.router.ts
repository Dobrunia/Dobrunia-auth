import { Router } from 'express';
import { oauthClientsController } from './oauth-clients.controller';

export const oauthClientsRouter = Router();

oauthClientsRouter.post(
  '/oauth/clients',
  (req, res) => oauthClientsController.createClient(req, res)
);

oauthClientsRouter.get(
  '/oauth/clients',
  (req, res) => oauthClientsController.getClients(req, res)
);

oauthClientsRouter.get(
  '/oauth/clients/:id',
  (req, res) => oauthClientsController.getClientById(req, res)
);

oauthClientsRouter.patch(
  '/oauth/clients/:id',
  (req, res) => oauthClientsController.updateClient(req, res)
);

oauthClientsRouter.post(
  '/oauth/clients/:id/regenerate-secret',
  (req, res) => oauthClientsController.regenerateSecret(req, res)
);

oauthClientsRouter.delete(
  '/oauth/clients/:id',
  (req, res) => oauthClientsController.deleteClient(req, res)
);
