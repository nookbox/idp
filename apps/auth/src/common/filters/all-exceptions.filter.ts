import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

import {
  ConflictError,
  DomainError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../errors/domain.error';
import { REQUEST_ID_TOKEN_HEADER } from '../constants';
import { BaseApiException } from '../exceptions/base-api.exception';
import { AppLogger } from '../logger';
import { createRequestContext } from '../request-context/util';

function statusForDomainError(err: DomainError): HttpStatus {
  if (err instanceof ConflictError) return HttpStatus.CONFLICT;
  if (err instanceof NotFoundError) return HttpStatus.NOT_FOUND;
  if (err instanceof UnauthorizedError) return HttpStatus.UNAUTHORIZED;
  if (err instanceof ForbiddenError) return HttpStatus.FORBIDDEN;
  if (err instanceof ValidationError) return HttpStatus.BAD_REQUEST;
  return HttpStatus.INTERNAL_SERVER_ERROR;
}

@Catch()
export class AllExceptionsFilter<T> implements ExceptionFilter {
  /** 로거 컨텍스트 설정 */
  constructor(private readonly logger: AppLogger) {
    this.logger.setContext(AllExceptionsFilter.name);
  }

  catch(exception: T, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req: Request = ctx.getRequest<Request>();
    const res: Response = ctx.getResponse<Response>();

    const path = req.url;
    const timestamp = new Date().toISOString();
    const requestId = req.headers[REQUEST_ID_TOKEN_HEADER];
    const requestContext = createRequestContext(req);

    let stack: string | undefined = undefined;
    let statusCode: HttpStatus | undefined = undefined;
    let errorName: string | undefined = undefined;
    let message: string | undefined = undefined;
    let details: unknown = undefined;
    // TODO : 헤더의 언어 값에 따라 현지화된(localized) 메시지를 반환하도록 개선 필요
    const acceptedLanguage = 'ja';
    let localizedMessage: string | undefined = undefined;

    if (exception instanceof BaseApiException) {
      statusCode = exception.getStatus();
      errorName = exception.constructor.name;
      message = exception.message;
      localizedMessage = exception.localizedMessage
        ? exception.localizedMessage[acceptedLanguage]
        : undefined;
      details = exception.details || exception.getResponse();
    } else if (exception instanceof DomainError) {
      statusCode = statusForDomainError(exception);
      errorName = exception.constructor.name;
      message = exception.message;
      stack = exception.stack;
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      errorName = exception.constructor.name;
      message = exception.message;
      details = exception.getResponse();
    } else if (exception instanceof Error) {
      errorName = exception.constructor.name;
      message = exception.message;
      stack = exception.stack;
    }

    statusCode = statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
    errorName = errorName || 'InternalException';
    message = message || 'Internal server error';

    // 참고: 에러 응답 포맷은 https://cloud.google.com/apis/design/errors 가이드 참조
    const error = {
      statusCode,
      message,
      localizedMessage,
      errorName,
      details,
      path,
      requestId,
      timestamp,
    };
    this.logger.warn(requestContext, error.message, {
      error,
      stack,
    });

    // 운영 환경에서는 500 에러의 원본 상세 메시지를 노출하지 않고 일반 메시지로 가린다 (보안)
    const isProd = process.env.NODE_ENV === 'production';
    if (isProd && statusCode === HttpStatus.INTERNAL_SERVER_ERROR) {
      error.message = 'Internal server error';
    }

    res.status(statusCode).json({ error });
  }
}
