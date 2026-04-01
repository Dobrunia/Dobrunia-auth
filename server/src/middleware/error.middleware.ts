import type { Request, Response, NextFunction } from 'express';
import { Log } from '../utils/log';

/** Operational / client errors with explicit HTTP status */
export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (res.headersSent) {
    return;
  }

  if (err instanceof HttpError) {
    if (err.statusCode >= 500) {
      Log.warn('HTTP 5xx (HttpError)', { status: err.statusCode, message: err.message });
    }
    res.status(err.statusCode).json({ error: { message: err.message } });
    return;
  }

  Log.error('Unhandled server error', err);

  res.status(500).json({ error: { message: 'Internal Server Error' } });
}
