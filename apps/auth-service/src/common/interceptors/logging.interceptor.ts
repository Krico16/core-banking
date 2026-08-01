import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const correlationId =
      request.headers['x-correlation-id'] ||
      request.headers['x-request-id'] ||
      'unknown';
    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const { statusCode } = response;

        console.log(
          JSON.stringify({
            method,
            url,
            statusCode,
            durationMs: Date.now() - now,
            correlationId,
            message: `${method} ${url}`,
          }),
        );
      }),
    );
  }
}
