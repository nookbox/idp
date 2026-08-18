import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  PayloadTooLargeException,
} from '@nestjs/common';
import { firstValueFrom, of, throwError } from 'rxjs';

import { MulterExceptionInterceptor } from './multer-exception.interceptor';

/**
 * multer가 실제로 던지는 에러를 흉내 낸다.
 * multer는 일반 Error에 name='MulterError'와 code를 붙여서 던진다.
 */
function createMulterError(code: string, field?: string) {
  const error = new Error(code) as Error & { code: string; field?: string };
  error.name = 'MulterError';
  error.code = code;
  error.field = field;
  return error;
}

/**
 * 인터셉터를 실행하고 결과를 Promise로 돌려준다.
 *
 * 인터셉터는 next.handle()이 주는 스트림을 받아서 가공한다.
 * 여기서는 그 next를 가짜로 만들어 원하는 에러를 흘려보낸다.
 * firstValueFrom은 스트림의 첫 값을 Promise로 바꿔주는 rxjs 함수다.
 */
function run(next: CallHandler) {
  const interceptor = new MulterExceptionInterceptor();
  return firstValueFrom(interceptor.intercept({} as ExecutionContext, next));
}

/** 에러를 던지는 가짜 핸들러 */
function failWith(error: unknown): CallHandler {
  return { handle: () => throwError(() => error) };
}

describe('MulterExceptionInterceptor', () => {
  describe('multer 에러 변환', () => {
    it('파일 크기 초과는 413으로 바꾼다', async () => {
      const promise = run(failWith(createMulterError('LIMIT_FILE_SIZE')));

      await expect(promise).rejects.toBeInstanceOf(PayloadTooLargeException);
    });

    it('필드명이 다르면 400으로 바꾸고 필드명을 알려준다', async () => {
      const promise = run(
        failWith(createMulterError('LIMIT_UNEXPECTED_FILE', 'file')),
      );

      await expect(promise).rejects.toBeInstanceOf(BadRequestException);
      // rejects.toThrow에 문자열을 주면 "메시지에 이 문구가 포함되는지"를 본다.
      await expect(promise).rejects.toThrow('file');
    });

    it('모르는 코드는 400으로 떨어뜨린다', async () => {
      const promise = run(failWith(createMulterError('LIMIT_PART_COUNT')));

      await expect(promise).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('건드리지 않아야 하는 경우', () => {
    it('multer 에러가 아니면 그대로 흘려보낸다', async () => {
      // 이게 없으면 DB 에러 같은 진짜 서버 오류까지 400으로 둔갑한다.
      const original = new Error('database connection lost');

      await expect(run(failWith(original))).rejects.toBe(original);
    });

    it('name만 MulterError이고 code가 없으면 손대지 않는다', async () => {
      const fake = new Error('not really multer');
      fake.name = 'MulterError';

      await expect(run(failWith(fake))).rejects.toBe(fake);
    });

    it('에러가 없으면 결과를 그대로 통과시킨다', async () => {
      const next: CallHandler = { handle: () => of({ ok: true }) };

      await expect(run(next)).resolves.toEqual({ ok: true });
    });
  });
});
