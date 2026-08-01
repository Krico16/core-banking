export const loggerConfig = {
  pinoHttp: {
    level: process.env.LOG_LEVEL || 'info',
    transport:
      process.env.NODE_ENV === 'development'
        ? {
            target: 'pino-pretty',
            options: {
              singleLine: true,
              colorize: true,
            },
          }
        : undefined,
    serializers: {
      req: (req: { method?: string; url?: string; headers?: Record<string, string | string[]> }) => ({
        method: req.method,
        url: req.url,
        correlationId: req.headers?.['x-correlation-id'] || req.headers?.['x-request-id'],
      }),
    },
  },
};
