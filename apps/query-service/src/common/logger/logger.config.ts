export const loggerConfig = {
  pinoHttp: {
    level: process.env.LOG_LEVEL || 'info',
    transport:
      process.env.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { singleLine: true, colorize: true } }
        : undefined,
  },
};
