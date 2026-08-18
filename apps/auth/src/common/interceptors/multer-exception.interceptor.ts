import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
  PayloadTooLargeException,
} from '@nestjs/common';
import { Observable, catchError, throwError } from 'rxjs';

/**
 * multer가 던지는 에러의 최소 형태.
 *
 * multer 패키지를 직접 import 하지 않는다.
 * 이 프로젝트의 직접 의존성이 아니라 @nestjs/platform-express가 내부에서 쓸 뿐이라,
 * pnpm 환경에서는 'multer'가 해석되지 않는다. 그래서 name/code로만 판별한다.
 */
interface MulterErrorLike extends Error {
  code: string;
  field?: string;
}

function isMulterError(error: unknown): error is MulterErrorLike {
  return (
    error instanceof Error &&
    error.name === 'MulterError' &&
    typeof (error as MulterErrorLike).code === 'string'
  );
}

/** multer 에러 코드를 적절한 HTTP 상태로 옮긴다. */
function toHttpException(error: MulterErrorLike): HttpException {
  switch (error.code) {
    // limits.fileSize 초과
    case 'LIMIT_FILE_SIZE':
      return new PayloadTooLargeException(
        '파일 크기가 허용 범위를 초과했습니다.',
      );

    // 서버가 기다리는 필드명과 다른 이름으로 파일이 왔을 때.
    // 예) FileInterceptor('avatar')인데 클라이언트가 'file'로 보낸 경우
    case 'LIMIT_UNEXPECTED_FILE':
      return new BadRequestException(
        `예상하지 못한 파일 필드입니다: ${error.field ?? '(이름 없음)'}`,
      );

    case 'LIMIT_FILE_COUNT':
      return new BadRequestException('업로드 가능한 파일 개수를 초과했습니다.');

    default:
      return new BadRequestException(
        `파일 업로드에 실패했습니다: ${error.code}`,
      );
  }
}

/**
 * multer 에러를 HttpException으로 변환한다.
 *
 * 변환하지 않으면 MulterError가 그냥 Error로 취급돼 전역 AllExceptionsFilter에서
 * 500으로 나간다. 클라이언트 잘못인데 서버 오류로 보이는 셈이다.
 *
 * 필터가 아니라 인터셉터인 이유:
 * 여기서 HttpException을 다시 던지면 전역 필터가 평소와 똑같은 형태로 응답을
 * 만들어준다. 필터로 처리하면 응답 포맷을 여기서 다시 짜야 해서 갈라진다.
 *
 * 반드시 FileInterceptor보다 먼저 등록해야 한다. 먼저 등록된 인터셉터가 바깥을
 * 감싸고, 안쪽(FileInterceptor)에서 난 에러를 잡을 수 있다.
 * ApiFile 데코레이터에서 UseInterceptors 한 번에 순서대로 넘기고 있다.
 */
@Injectable()
export class MulterExceptionInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(
      catchError((error: unknown) =>
        // multer 에러가 아니면 손대지 않고 그대로 흘려보낸다.
        throwError(() =>
          isMulterError(error) ? toHttpException(error) : error,
        ),
      ),
    );
  }
}
