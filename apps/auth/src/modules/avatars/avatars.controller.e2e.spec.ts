import { INestApplication, createParamDecorator } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

/**
 * @thallesp/nestjs-better-auth는 ESM(.mjs)이라 jest가 그대로는 파싱하지 못한다.
 * 팩토리를 주면 jest가 진짜 모듈을 불러오지 않고 이 가짜로 대체한다.
 *
 * 어차피 e2e에서 검증하려는 건 파일 업로드 배선이지 인증이 아니므로
 * 세션은 고정값으로 흘려보낸다.
 *
 * jest.mock은 import보다 먼저 끌어올려지므로 파일 맨 위에 둔다.
 */
jest.mock('@thallesp/nestjs-better-auth', () => ({
  Session: createParamDecorator(() => ({ user: { id: 'test-user-id' } })),
}));

import { AvatarsController } from './avatars.controller';
import { AvatarsService } from './avatars.service';

/**
 * e2e 테스트 = 앱 전체를 띄우고 진짜 HTTP 요청을 보내보는 테스트.
 *
 * 단위 테스트(pipe.spec.ts)는 클래스 하나만 직접 호출하므로
 * "인터셉터 순서가 맞는지", "필드명이 맞는지" 같은 배선 문제를 못 잡는다.
 * 여기서는 요청이 라우터 -> 인터셉터 -> multer -> 파이프 -> 컨트롤러 순서로
 * 실제로 흘러간다.
 */

// 각 포맷의 매직 넘버. 파이프가 앞부분만 보므로 진짜 이미지 파일이 필요 없다.
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PHP = Buffer.from('<?php echo 1; ?>');

describe('AvatarsController (e2e)', () => {
  let app: INestApplication;

  // 실제 서비스는 디스크에 파일을 쓴다. 테스트가 파일을 남기지 않도록
  // 가짜로 바꿔치기하고, 무엇이 넘어왔는지 확인하는 용도로만 쓴다.
  const uploadProfileImage = jest.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AvatarsController],
      providers: [AvatarsService],
    })
      .overrideProvider(AvatarsService)
      .useValue({ uploadProfileImage })
      .compile();

    app = moduleRef.createNestApplication();

    // listen()이 아니라 init(). 포트를 열지 않고 메모리에만 올린다.
    // 그래서 빠르고 포트 충돌도 없다.
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // 각 테스트가 앞선 호출 기록에 영향받지 않도록 매번 비운다.
  beforeEach(() => {
    uploadProfileImage.mockReset();
    uploadProfileImage.mockResolvedValue({ filePath: 'uploads/avatars/x.png' });
  });

  describe('정상 업로드', () => {
    it('유효한 png를 받는다', async () => {
      await request(app.getHttpServer())
        // .attach(필드명, 내용, 파일명) - Postman의 form-data 파일 첨부와 같다
        .post('/avatars/upload')
        .attach('avatar', PNG, 'photo.png')
        .expect(201);
    });

    it('파이프가 교정한 파일을 서비스에 넘긴다', async () => {
      await request(app.getHttpServer())
        .post('/avatars/upload')
        .attach('avatar', PNG, 'photo.jpg') // 이름은 .jpg지만 내용은 PNG
        .expect(201);

      // 세션의 userId와 교정된 파일이 함께 넘어갔는지 확인한다.
      expect(uploadProfileImage).toHaveBeenCalledWith(
        'test-user-id',
        expect.objectContaining({
          mimetype: 'image/png',
          originalname: 'photo.png', // .jpg -> .png 로 교정됨
        }),
      );
    });
  });

  describe('거부', () => {
    it('확장자를 위장한 파일을 400으로 막는다', async () => {
      // 이름은 .png인데 내용은 PHP.
      // FileTypeValidationPipe가 실제로 물려 있는지 확인하는 케이스다.
      await request(app.getHttpServer())
        .post('/avatars/upload')
        .attach('avatar', PHP, 'evil.png')
        .expect(400);

      // 막혔으면 서비스까지 내려가지 않아야 한다.
      expect(uploadProfileImage).not.toHaveBeenCalled();
    });

    it('파일이 없으면 400을 준다', async () => {
      // ParseFilePipe가 걸려 있는지 확인한다.
      await request(app.getHttpServer()).post('/avatars/upload').expect(400);
    });

    it('필드명이 다르면 400을 준다', async () => {
      // 서버는 'avatar'를 기다리는데 'file'로 보낸 경우.
      // 단위 테스트로는 절대 못 잡는 배선 문제다.
      await request(app.getHttpServer())
        .post('/avatars/upload')
        .attach('file', PNG, 'photo.png')
        .expect(400);
    });

    it('5MB를 넘으면 413을 준다', async () => {
      // 이 테스트가 MulterExceptionInterceptor가 FileInterceptor보다
      // 바깥에 있는지를 증명한다. 순서가 뒤집히면 multer 에러를 못 잡아
      // 500이 나온다.
      const tooBig = Buffer.alloc(6 * 1024 * 1024);

      await request(app.getHttpServer())
        .post('/avatars/upload')
        .attach('avatar', tooBig, 'big.png')
        .expect(413);
    });
  });
});
