import { INestApplication, createParamDecorator } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

// avatars.controller.e2e.spec.ts 와 같은 이유로 ESM 모듈을 가짜로 바꾼다.
jest.mock('@thallesp/nestjs-better-auth', () => ({
  Session: createParamDecorator(() => ({ user: { id: 'test-user-id' } })),
}));

import { AppThrottlerModule } from '@/common/throttler/throttler.module';

import { AvatarsController } from './avatars.controller';
import { AvatarsService } from './avatars.service';
import { AVATAR_UPLOAD_RATE_LIMIT } from './constants/avatars.constants';

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * 업로드 폭주 방어가 실제로 배선되어 있는지 확인한다.
 *
 * @Throttle 은 그냥 메타데이터라, 전역 가드 등록을 빠뜨려도 컴파일도 되고
 * 테스트도 통과한다. 그래서 "한도를 넘으면 진짜 429 가 나오는지"를 HTTP 로
 * 확인해야 의미가 있다.
 */
describe('AvatarsController 요청 제한 (e2e)', () => {
  let app: INestApplication;
  const uploadProfileImage = jest.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppThrottlerModule],
      controllers: [AvatarsController],
      providers: [AvatarsService],
    })
      .overrideProvider(AvatarsService)
      .useValue({ uploadProfileImage })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    uploadProfileImage.mockReset();
    uploadProfileImage.mockResolvedValue({ image: 'https://x/y.png' });
  });

  const upload = (ip: string) =>
    request(app.getHttpServer())
      .post('/avatars/upload')
      .set('cf-connecting-ip', ip)
      .attach('avatar', PNG, 'photo.png');

  it(`한도(${AVATAR_UPLOAD_RATE_LIMIT.limit}회)를 넘으면 429 를 낸다`, async () => {
    const ip = '203.0.113.10';

    for (let i = 0; i < AVATAR_UPLOAD_RATE_LIMIT.limit; i++) {
      await upload(ip).expect(201);
    }

    await upload(ip).expect(429);

    // 한도를 넘은 요청은 서비스까지 내려가지 않는다.
    // = 파일을 읽지도, 디스크에 쓰지도 않는다는 뜻.
    expect(uploadProfileImage).toHaveBeenCalledTimes(
      AVATAR_UPLOAD_RATE_LIMIT.limit,
    );
  });

  it('한 IP 가 한도를 채워도 다른 IP 는 멀쩡하다', async () => {
    // ⚠️ 이 테스트가 진짜 잡으려는 것: 기본 ThrottlerGuard 는 req.ip 로
    //    요청자를 구분하는데, cloudflared 뒤에서는 그 값이 전부 같다.
    //    ClientIpThrottlerGuard 를 빼면 아래 마지막 줄이 429 가 되고,
    //    그건 곧 "한 명이 전 사용자를 막을 수 있다"는 뜻이다.
    const attacker = '198.51.100.1';
    for (let i = 0; i < AVATAR_UPLOAD_RATE_LIMIT.limit; i++) {
      await upload(attacker).expect(201);
    }
    await upload(attacker).expect(429);

    await upload('198.51.100.2').expect(201);
  });
});
