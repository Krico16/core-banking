import { isPublicRoute } from './is-public-route';

describe('isPublicRoute', () => {
  it.each([
    ['POST', '/api/auth/register'],
    ['POST', '/api/auth/login'],
    ['POST', '/api/auth/refresh'],
  ])('treats %s %s as public', (method, path) => {
    expect(isPublicRoute(method, path)).toBe(true);
  });

  it.each([
    ['GET', '/api/health'],
    ['GET', '/api/health/'],
    ['GET', '/api/ready'],
    ['GET', '/api/accounts/health'],
    ['GET', '/api/query/customers/health'],
  ])('treats health/ready suffix %s %s as public regardless of prefix', (method, path) => {
    expect(isPublicRoute(method, path)).toBe(true);
  });

  it.each([
    ['GET', '/api/auth/me'],
    ['POST', '/api/auth/logout'],
    ['GET', '/api/accounts/acc_1'],
    ['POST', '/api/payments/transfer'],
    ['GET', '/api/query/payments/pay_1'],
    ['GET', '/api/auth/login'],
  ])('treats %s %s as protected', (method, path) => {
    expect(isPublicRoute(method, path)).toBe(false);
  });

  it('is case-insensitive on method and ignores query strings', () => {
    expect(isPublicRoute('post', '/api/auth/login?foo=bar')).toBe(true);
  });
});
