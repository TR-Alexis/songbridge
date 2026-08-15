import { NextFunction, Request, Response } from 'express';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error(err);
  if (err.message.includes('OAuth state')) return res.status(400).json({ error: err.message });
  if (err.message.startsWith('No provider account') || err.message.includes('session expired')) {
    return res.status(409).json({ error: err.message });
  }

  const message = process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message || 'Internal Server Error';
  return res.status(500).json({ error: message });
}
