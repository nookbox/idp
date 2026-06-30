// 서비스 레이어에서 던지는 도메인 에러의 베이스.
// HTTP/transport에 묶이지 않으며, AllExceptionsFilter에서 적절한 HTTP status로 매핑된다.
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class ConflictError extends DomainError {}
export class NotFoundError extends DomainError {}
export class UnauthorizedError extends DomainError {}
export class ForbiddenError extends DomainError {}
export class ValidationError extends DomainError {}
