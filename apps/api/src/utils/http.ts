import { Response } from 'express';
import { logger } from './logger';

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function parsePositiveNumber(value: unknown, fallback: number): number {
  if (typeof value !== 'string') {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function parseRequiredNumber(value: unknown, fieldName: string): number {
  const parsed = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(parsed)) {
    throw new HttpError(400, `${fieldName} must be a number`);
  }

  return parsed;
}

export function sendError(res: Response, error: unknown): void {
  if (error instanceof HttpError) {
    logger.debug('api.route_error', {
      requestId: res.locals.requestId,
      status: error.status,
      message: error.message,
    });
    res.status(error.status).json({ error: error.message });
    return;
  }

  logger.error('api.unexpected_error', { requestId: res.locals.requestId, status: 500 });
  console.error(error);
  res.status(500).json({ error: 'Internal server error' });
}
