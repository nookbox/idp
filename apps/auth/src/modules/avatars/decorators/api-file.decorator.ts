import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';

// 배럴(@/common)이 아니라 파일을 직접 가리킨다.
// 배럴을 거치면 request-id.middleware -> uuid(ESM)까지 딸려와 jest가 깨진다.
import { MulterExceptionInterceptor } from '@/common/interceptors/multer-exception.interceptor';

export function ApiFile(
  fieldName: string = 'file',
  required: boolean = false,
  localOptions?: MulterOptions,
) {
  return applyDecorators(
    // MulterExceptionInterceptor가 먼저 와야 FileInterceptor 안에서 난
    // multer 에러(파일 크기 초과 등)를 잡아 적절한 상태 코드로 바꿀 수 있다.
    UseInterceptors(
      MulterExceptionInterceptor,
      FileInterceptor(fieldName, localOptions),
    ),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        required: required ? [fieldName] : [],
        properties: {
          [fieldName]: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    }),
  );
}
