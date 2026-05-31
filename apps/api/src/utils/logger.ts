import { randomUUID } from 'crypto';
import { NextFunction, Request, RequestHandler, Response } from 'express';

type LogValue = string | number | boolean | null | undefined;
export type LogFields = Record<string, LogValue>;

const debugValues = new Set(['true', '1', 'yes', 'debug']);

export function isApiDebugEnabled(): boolean {
  return debugValues.has(String(process.env.API_DEBUG ?? '').trim().toLowerCase());
}

function formatFields(fields: LogFields = {}): string {
  const formatted = Object.entries(fields)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`);

  return formatted.length > 0 ? ` ${formatted.join(' ')}` : '';
}

function writeLog(level: 'debug' | 'info' | 'error', event: string, fields?: LogFields, force = false): void {
  if (!force && !isApiDebugEnabled()) {
    return;
  }

  const line = `[${new Date().toISOString()}] ${level} ${event}${formatFields(fields)}`;

  if (level === 'error') {
    console.error(line);
    return;
  }

  console.log(line);
}

function requestIdFromHeader(req: Request): string {
  const header = req.header('x-request-id');
  return header?.trim() || randomUUID();
}

export const logger = {
  debug(event: string, fields?: LogFields): void {
    writeLog('debug', event, fields);
  },
  info(event: string, fields?: LogFields): void {
    writeLog('info', event, fields, true);
  },
  error(event: string, fields?: LogFields): void {
    writeLog('error', event, fields, true);
  },
};

export function createRequestLogger(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const requestId = requestIdFromHeader(req);
    res.locals.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);

    if (!isApiDebugEnabled()) {
      next();
      return;
    }

    const startedAt = process.hrtime.bigint();

    res.on('finish', () => {
      const durationMs = Number((process.hrtime.bigint() - startedAt) / BigInt(1_000_000));

      logger.debug('api.request', {
        requestId,
        method: req.method,
        path: req.originalUrl.split('?')[0],
        status: res.statusCode,
        durationMs,
      });
    });

    next();
  };
}
