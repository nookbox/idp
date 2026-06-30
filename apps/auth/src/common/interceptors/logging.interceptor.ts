import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { AppLogger } from '../logger';
import { createRequestContext } from '../request-context/util';

@Injectable()
export class LoggingInterceptor implements NestInterceptor<unknown, unknown> {
  constructor(private appLogger: AppLogger) {
    this.appLogger.setContext(LoggingInterceptor.name);
  }

  intercept(
    context: ExecutionContext,
    next: CallHandler<unknown>,
  ): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const ctx = createRequestContext(request);

    const now = Date.now();
    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const statusCode = response.statusCode;

        const responseTime = Date.now() - now;

        const resData = { method, statusCode, responseTime };

        this.appLogger.log(ctx, 'Request completed', { resData });
      }),
    );
  }
}
