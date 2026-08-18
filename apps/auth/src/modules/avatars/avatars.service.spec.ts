import { readFile, rm } from 'fs/promises';
import { dirname } from 'path';

import { AvatarsService } from './avatars.service';

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function createFile(buffer: Buffer, originalname: string) {
  return { buffer, originalname } as Express.Multer.File;
}

describe('AvatarsService', () => {
  const service = new AvatarsService();

  // 이 테스트는 진짜로 디스크에 파일을 쓴다.
  // 테스트가 남긴 파일을 끝나고 지운다.
  const written: string[] = [];

  afterAll(async () => {
    await Promise.all(written.map((path) => rm(path, { force: true })));
  });

  it('파일을 저장하고 저장 경로를 돌려준다', async () => {
    const result = await service.uploadProfileImage(
      'user-1',
      createFile(PNG, 'photo.png'),
    );
    written.push(result.filePath);

    // 실제 응답이 어떤 모양인지 여기서 확인할 수 있다.
    // (console.log 대신 expect로 박아두면 나중에 바뀌었을 때 바로 잡힌다)
    expect(result).toEqual({
      message: 'Profile image uploaded successfully',
      filePath: expect.stringMatching(/^uploads\/avatars\/[0-9a-f-]{36}\.png$/),
    });

    // 디스크에 진짜로 같은 내용이 쓰였는지 확인
    await expect(readFile(result.filePath)).resolves.toEqual(PNG);
  });

  it('같은 이름으로 두 번 올려도 파일이 덮어써지지 않는다', async () => {
    const first = await service.uploadProfileImage(
      'user-1',
      createFile(PNG, 'photo.png'),
    );
    const second = await service.uploadProfileImage(
      'user-2',
      createFile(PNG, 'photo.png'),
    );
    written.push(first.filePath, second.filePath);

    // randomUUID로 이름을 만들기 때문에 서로 달라야 한다
    expect(first.filePath).not.toBe(second.filePath);
    expect(dirname(first.filePath)).toBe(dirname(second.filePath));
  });
});
