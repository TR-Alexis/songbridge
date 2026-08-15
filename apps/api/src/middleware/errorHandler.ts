import { NextFunction, Request, Response } from 'express';

function extractMessage(err: unknown): string {
  if (typeof err === 'string') return err;
  if (!err || typeof err !== 'object') return 'Internal Server Error';

  const value = err as Record<string, unknown>;
  const body = value.body && typeof value.body === 'object' ? value.body as Record<string, unknown> : undefined;
  const candidates = [value.message, body?.error_description, body?.message, body?.error];

  for (const candidate of candidates) {
    if (typeof candidate === 'string') return candidate;
    if (candidate && typeof candidate === 'object') {
      const nested = candidate as Record<string, unknown>;
      if (typeof nested.error_description === 'string') return nested.error_description;
      if (typeof nested.message === 'string') return nested.message;
      if (typeof nested.error === 'string') return nested.error;
    }
  }
  return 'Internal Server Error';
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  const detail = extractMessage(err);
  const value = err && typeof err === 'object' ? err as Record<string, unknown> : {};
  console.error('Request failed', {
    name: typeof value.name === 'string' ? value.name : 'Error',
    message: detail,
    code: typeof value.code === 'string' ? value.code : undefined,
    statusCode: typeof value.statusCode === 'number' ? value.statusCode : undefined,
  });
  if (detail.includes('OAuth state')) return res.status(400).json({ error: detail });
  if (detail.startsWith('No provider account') || detail.includes('session expired')) {
    return res.status(409).json({ error: detail });
  }

  const message = process.env.NODE_ENV === 'production' ? 'Internal Server Error' : detail;
  return res.status(500).json({ error: message });
}
