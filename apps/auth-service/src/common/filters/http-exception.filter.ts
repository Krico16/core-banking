import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { DomainException } from '../../domain';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.getResponse();
    } else if (exception instanceof DomainException) {
      status = exception.httpStatusCode;
      message = exception.message;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message:
        typeof message === 'string'
          ? message
          : (message as Record<string, unknown>)?.message || message,
      correlationId:
        request.headers['x-correlation-id'] ||
        request.headers['x-request-id'],
    };

    if (status >= 500) {
      console.error(
        JSON.stringify({
          status,
          path: request.url,
          method: request.method,
          error: exception instanceof Error ? exception.message : 'Unknown error',
          stack: exception instanceof Error ? exception.stack : undefined,
        }),
      );
    }

    response.status(status).json(errorResponse);
  }
}
