import { readFile, rm } from 'fs/promises';
import { basename, join } from 'path';

import type { Database } from '@/database/database.types';
import { AVATAR_DIR } from './constants/avatars.constants';
import { AvatarsService } from './avatars.service';

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function createFile(buffer: Buffer, originalname: string) {
  return { buffer, originalname } as Express.Multer.File;
}

/**
 * drizzle 을 흉내 낸 가짜 DB.
 *
 * 진짜 drizzle 은 .select().from().where() 처럼 체인으로 이어지고
 * 마지막에 await 하면 결과가 나온다. 그 모양만 맞춰준다.
 *
 * selectResult 로 "이 유저의 기존 이미지" 를 지정하고,
 * updates 에 어떤 값으로 갱신됐는지 쌓아둔다.
 */
function createDb(selectResult: unknown[] = []) {
  const updates: Record<string, unknown>[] = [];

  const db = {
    select: () => ({
      from: () => ({
        where: () => Promise.resolve(selectResult),
      }),
    }),
    update: () => ({
      set: (values: Record<string, unknown>) => ({
        where: () => {
          updates.push(values);
          return Promise.resolve();
        },
      }),
    }),
  } as unknown as Database;

  return { db, updates };
}

describe('AvatarsService', () => {
  // 이 테스트는 진짜로 디스크에 파일을 쓴다. 끝나고 지운다.
  const written: string[] = [];

  const track = (image: string) => {
    const filename = basename(new URL(image).pathname);
    written.push(join(AVATAR_DIR, filename));
    return filename;
  };

  afterAll(async () => {
    await Promise.all(written.map((path) => rm(path, { force: true })));
  });

  it('파일을 저장하고 절대 URL 을 돌려준다', async () => {
    const { db, updates } = createDb();
    const service = new AvatarsService(db);

    const result = await service.uploadProfileImage(
      'user-1',
      createFile(PNG, 'photo.png'),
    );
    const filename = track(result.image);

    expect(result.image).toMatch(
      /^https?:\/\/.+\/uploads\/avatars\/[0-9a-f-]{36}\.png$/,
    );

    // 디스크에 진짜로 같은 내용이 쓰였는지 확인
    await expect(readFile(join(AVATAR_DIR, filename))).resolves.toEqual(PNG);

    // user 레코드가 갱신됐는지 확인
    expect(updates).toEqual([
      { image: result.image, imageKey: filename, imageSource: 'upload' },
    ]);
  });

  it('같은 이름으로 두 번 올려도 파일이 덮어써지지 않는다', async () => {
    const { db } = createDb();
    const service = new AvatarsService(db);

    const first = await service.uploadProfileImage(
      'user-1',
      createFile(PNG, 'photo.png'),
    );
    const second = await service.uploadProfileImage(
      'user-2',
      createFile(PNG, 'photo.png'),
    );
    track(first.image);
    track(second.image);

    // randomUUID 로 이름을 만들기 때문에 서로 달라야 한다
    expect(first.image).not.toBe(second.image);
  });

  it('직접 올렸던 예전 파일은 지운다', async () => {
    // 먼저 한 장 올려서 지워질 대상을 만든다.
    const seed = await new AvatarsService(createDb().db).uploadProfileImage(
      'user-1',
      createFile(PNG, 'old.png'),
    );
    const oldFilename = track(seed.image);

    // 그 파일이 기존 이미지였다고 알려준 상태로 새로 올린다.
    const { db } = createDb([{ imageKey: oldFilename, imageSource: 'upload' }]);
    const result = await new AvatarsService(db).uploadProfileImage(
      'user-1',
      createFile(PNG, 'new.png'),
    );
    track(result.image);

    await expect(readFile(join(AVATAR_DIR, oldFilename))).rejects.toThrow();
  });

  it('구글 등 외부 이미지였으면 파일을 지우려 들지 않는다', async () => {
    // imageSource 가 'upload' 가 아니면 우리가 가진 파일이 아니다.
    const { db } = createDb([{ imageKey: null, imageSource: 'google' }]);

    const result = await new AvatarsService(db).uploadProfileImage(
      'user-1',
      createFile(PNG, 'photo.png'),
    );
    track(result.image);

    expect(result.image).toContain('/uploads/avatars/');
  });
});
