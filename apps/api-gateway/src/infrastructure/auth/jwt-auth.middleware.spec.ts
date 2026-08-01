import { Request, Response } from 'express';
import { createJwtAuthMiddleware } from './jwt-auth.middleware';
import { TokenVerifierPort } from '../../domain/ports/token-verifier.port';
import { InvalidTokenError } from '../../domain/errors/invalid-token.error';

function mockResponse(): Response {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

function mockRequest(method: string, originalUrl: string, authHeader?: string): Request {
  return {
    method,
    originalUrl,
    headers: authHeader ? { authorization: authHeader } : {},
  } as unknown as Request;
}

describe('jwtAuthMiddleware', () => {
  let verifier: jest.Mocked<TokenVerifierPort>;
  let next: jest.Mock;

  beforeEach(() => {
    verifier = { verify: jest.fn() };
    next = jest.fn();
  });

  it('lets public routes through without checking the token', () => {
    const middleware = createJwtAuthMiddleware(verifier);
    const req = mockRequest('POST', '/api/auth/login');
    const res = mockResponse();

    middleware(req, res, next);

    expect(verifier.verify).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('rejects protected routes without an authorization header', () => {
    const middleware = createJwtAuthMiddleware(verifier);
    const req = mockRequest('GET', '/api/accounts/acc_1');
    const res = mockResponse();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects protected routes with a malformed authorization header', () => {
    const middleware = createJwtAuthMiddleware(verifier);
    const req = mockRequest('GET', '/api/accounts/acc_1', 'Token abc123');
    const res = mockResponse();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() when the token verifies successfully', () => {
    verifier.verify.mockReturnValue({
      sub: 'user_1',
      roles: ['customer'],
      scopes: [],
      type: 'access',
    });
    const middleware = createJwtAuthMiddleware(verifier);
    const req = mockRequest('GET', '/api/accounts/acc_1', 'Bearer valid.token.here');
    const res = mockResponse();

    middleware(req, res, next);

    expect(verifier.verify).toHaveBeenCalledWith('valid.token.here');
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 401 when the verifier rejects the token', () => {
    verifier.verify.mockImplementation(() => {
      throw new InvalidTokenError('jwt expired');
    });
    const middleware = createJwtAuthMiddleware(verifier);
    const req = mockRequest('GET', '/api/accounts/acc_1', 'Bearer expired.token');
    const res = mockResponse();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }));
    expect(next).not.toHaveBeenCalled();
  });
});
