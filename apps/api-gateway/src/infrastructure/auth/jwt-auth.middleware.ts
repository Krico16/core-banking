import { Request, Response, NextFunction, RequestHandler } from 'express';
import { TokenVerifierPort } from '../../domain/ports/token-verifier.port';
import { InvalidTokenError } from '../../domain/errors/invalid-token.error';
import { isPublicRoute } from '../../application/services/is-public-route';

const BEARER_PREFIX = 'Bearer ';

export function createJwtAuthMiddleware(verifier: TokenVerifierPort): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (isPublicRoute(req.method, req.originalUrl)) {
      next();
      return;
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith(BEARER_PREFIX)) {
      res.status(401).json({ message: 'Missing or invalid authorization header' });
      return;
    }

    const token = authHeader.slice(BEARER_PREFIX.length);

    try {
      verifier.verify(token);
      next();
    } catch (error) {
      const message = error instanceof InvalidTokenError ? error.message : 'Invalid token';
      res.status(401).json({ message });
    }
  };
}
