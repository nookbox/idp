import { HttpException } from '@nestjs/common';

export class BaseApiException extends HttpException {
  public localizedMessage: Record<string, string> | undefined;
  public details: string | Record<string, unknown> | undefined;

  constructor(
    message: string,
    status: number,
    details?: string | Record<string, unknown>,
    localizedMessage?: Record<string, string>,
  ) {
    super(message, status);
    this.name = BaseApiException.name;
    this.localizedMessage = localizedMessage;
    this.details = details;
  }
}
