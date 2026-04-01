import type { Request, Response, NextFunction } from 'express';

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
    res.status(err.statusCode).json({ error: { message: err.message } });
    return;
  }

  res.status(500).json({ error: { message: 'Internal Server Error' } });
}
