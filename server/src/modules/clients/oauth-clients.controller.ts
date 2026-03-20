import { Request, Response } from 'express';
import { oauthClientsService } from './oauth-clients.service';
import { z } from 'zod';

const createClientSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  redirect_uris: z.array(z.string().url()).min(1, 'At least one redirect URI is required'),
  allowed_scopes: z.array(z.string()).optional().default(['openid', 'profile', 'email']),
  grant_types: z.array(z.string()).optional().default(['authorization_code', 'refresh_token']),
  is_active: z.boolean().optional().default(true),
});

const updateClientSchema = z.object({
  name: z.string().min(1).optional(),
  redirect_uris: z.array(z.string().url()).optional(),
  allowed_scopes: z.array(z.string()).optional(),
  grant_types: z.array(z.string()).optional(),
  is_active: z.boolean().optional(),
});

export class OAuthClientsController {
  async createClient(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = createClientSchema.parse(req.body);

      const result = await oauthClientsService.createClient({
        client_id: `client_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        name: validatedData.name,
        redirect_uris: validatedData.redirect_uris,
        allowed_scopes: validatedData.allowed_scopes,
        grant_types: validatedData.grant_types,
        client_secret_hash: null,
      });

      res.status(201).json({
        success: true,
        data: {
          client: {
            id: result.client.id,
            client_id: result.client.client_id,
            name: result.client.name,
            redirect_uris: result.client.redirect_uris,
            allowed_scopes: result.client.allowed_scopes,
            grant_types: result.client.grant_types,
            is_active: result.client.is_active,
            created_at: result.client.created_at,
          },
          client_secret: result.client_secret, // Only shown once
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.errors[0].message,
          },
        });
        return;
      }

      console.error('Create client error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      });
    }
  }

  async getClients(req: Request, res: Response): Promise<void> {
    try {
      const clients = await oauthClientsService.getClients();

      // Don't return secret hashes
      const safeClients = clients.map((c) => ({
        id: c.id,
        client_id: c.client_id,
        name: c.name,
        redirect_uris: c.redirect_uris,
        allowed_scopes: c.allowed_scopes,
        grant_types: c.grant_types,
        is_active: c.is_active,
        created_at: c.created_at,
      }));

      res.json({
        success: true,
        data: safeClients,
      });
    } catch (error) {
      console.error('Get clients error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      });
    }
  }

  async getClientById(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid client ID',
          },
        });
        return;
      }

      const client = await oauthClientsService.getClientById(id);

      if (!client) {
        res.status(404).json({
          success: false,
          error: {
            code: 'CLIENT_NOT_FOUND',
            message: 'OAuth client not found',
          },
        });
        return;
      }

      res.json({
        success: true,
        data: {
          id: client.id,
          client_id: client.client_id,
          name: client.name,
          redirect_uris: client.redirect_uris,
          allowed_scopes: client.allowed_scopes,
          grant_types: client.grant_types,
          is_active: client.is_active,
          created_at: client.created_at,
        },
      });
    } catch (error) {
      console.error('Get client error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      });
    }
  }

  async updateClient(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid client ID',
          },
        });
        return;
      }

      const validatedData = updateClientSchema.parse(req.body);

      const client = await oauthClientsService.updateClient(id, validatedData);

      if (!client) {
        res.status(404).json({
          success: false,
          error: {
            code: 'CLIENT_NOT_FOUND',
            message: 'OAuth client not found',
          },
        });
        return;
      }

      res.json({
        success: true,
        data: {
          id: client.id,
          client_id: client.client_id,
          name: client.name,
          redirect_uris: client.redirect_uris,
          allowed_scopes: client.allowed_scopes,
          grant_types: client.grant_types,
          is_active: client.is_active,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.errors[0].message,
          },
        });
        return;
      }

      console.error('Update client error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      });
    }
  }

  async regenerateSecret(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid client ID',
          },
        });
        return;
      }

      const result = await oauthClientsService.regenerateSecret(id);

      if (!result) {
        res.status(404).json({
          success: false,
          error: {
            code: 'CLIENT_NOT_FOUND',
            message: 'OAuth client not found',
          },
        });
        return;
      }

      res.json({
        success: true,
        data: {
          client_id: result.client.client_id,
          client_secret: result.client_secret, // Only shown once
        },
        warning: 'Store this secret securely. It will not be shown again.',
      });
    } catch (error) {
      console.error('Regenerate secret error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      });
    }
  }

  async deleteClient(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid client ID',
          },
        });
        return;
      }

      await oauthClientsService.deleteClient(id);

      res.json({
        success: true,
        message: 'OAuth client deleted successfully',
      });
    } catch (error) {
      console.error('Delete client error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      });
    }
  }
}

export const oauthClientsController = new OAuthClientsController();
