import { Request, Response } from 'express';
import { signingKeysService } from './signing-keys.service';
import { signingKeysRepository } from './signing-keys.repository';

export class SigningKeysController {
  /**
   * Get current signing keys status
   */
  async getStatus(_req: Request, res: Response): Promise<void> {
    try {
      const [activeKey, validationKeys] = await Promise.all([
        signingKeysService.getActiveKey(),
        signingKeysService.getValidationKeys(),
      ]);

      const rotationNeeded = await signingKeysService.isRotationNeeded();

      res.json({
        success: true,
        data: {
          activeKey: {
            key_id: activeKey.key_id,
            algorithm: activeKey.algorithm,
            created_at: activeKey.created_at,
            expires_at: activeKey.expires_at,
          },
          validationKeysCount: validationKeys.length,
          rotationNeeded,
        },
      });
    } catch (error) {
      console.error('Get signing keys status error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      });
    }
  }

  /**
   * Manually rotate signing key
   */
  async rotateKey(_req: Request, res: Response): Promise<void> {
    try {
      const result = await signingKeysService.rotateKey();

      res.json({
        success: true,
        data: result,
        message: 'Signing key rotated successfully',
      });
    } catch (error) {
      console.error('Rotate signing key error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to rotate signing key',
        },
      });
    }
  }

  /**
   * Clean up expired keys
   */
  async cleanup(_req: Request, res: Response): Promise<void> {
    try {
      const result = await signingKeysService.cleanup();

      res.json({
        success: true,
        data: result,
        message: 'Cleanup completed',
      });
    } catch (error) {
      console.error('Cleanup signing keys error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to cleanup signing keys',
        },
      });
    }
  }
}

export const signingKeysController = new SigningKeysController();
