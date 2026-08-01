import { RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';

export interface RateLimitOptions {
  windowMs: number;
  max: number;
}

export function createRateLimitMiddleware(options: RateLimitOptions): RequestHandler {
  return rateLimit({
    windowMs: options.windowMs,
    limit: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests, please try again later' },
  });
}
