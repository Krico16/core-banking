import { createProxyMiddleware, RequestHandler } from 'http-proxy-middleware';
import { ProxyRouteConfig } from '../config/routes.config';

export interface MountedProxyRoute {
  prefix: string;
  middleware: RequestHandler;
}

export function createProxyMiddlewares(routes: ProxyRouteConfig[]): MountedProxyRoute[] {
  return routes.map((route) => ({
    prefix: route.prefix,
    middleware: createProxyMiddleware({
      target: route.target,
      changeOrigin: true,
      pathRewrite: route.pathRewrite,
      logLevel: 'warn',
    }),
  }));
}
