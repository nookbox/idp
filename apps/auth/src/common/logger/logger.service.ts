import { Inject, Injectable, Scope } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

import { RequestContext } from './request-context.dto';

@Injectable({ scope: Scope.TRANSIENT })
export class AppLogger {
  private context?: string;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  public setContext(context: string): void {
    this.context = context;
  }

  error(
    ctx: RequestContext,
    message: string,
    meta?: Record<string, unknown>,
  ): Logger {
    const timestamp = new Date().toISOString();

    return this.logger.error({
      message,
      contextName: this.context,
      ctx,
      timestamp,
      ...meta,
    });
  }

  warn(
    ctx: RequestContext,
    message: string,
    meta?: Record<string, unknown>,
  ): Logger {
    const timestamp = new Date().toISOString();

    return this.logger.warn({
      message,
      contextName: this.context,
      ctx,
      timestamp,
      ...meta,
    });
  }

  debug(
    ctx: RequestContext,
    message: string,
    meta?: Record<string, unknown>,
  ): Logger {
    const timestamp = new Date().toISOString();

    return this.logger.debug({
      message,
      contextName: this.context,
      ctx,
      timestamp,
      ...meta,
    });
  }

  verbose(
    ctx: RequestContext,
    message: string,
    meta?: Record<string, unknown>,
  ): Logger {
    const timestamp = new Date().toISOString();

    return this.logger.verbose({
      message,
      contextName: this.context,
      ctx,
      timestamp,
      ...meta,
    });
  }

  log(
    ctx: RequestContext,
    message: string,
    meta?: Record<string, unknown>,
  ): Logger {
    const timestamp = new Date().toISOString();

    return this.logger.info({
      message,
      contextName: this.context,
      ctx,
      timestamp,
      ...meta,
    });
  }
}
