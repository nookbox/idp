import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { mkdir, rm, writeFile } from 'fs/promises';
import { extname, join } from 'path';

import { AUTH_SERVER_URL } from '@/common/constants';
import { DATABASE, type Database } from '@/database/database.types';
import { user } from '@/database/schema';

import { AVATAR_DIR, AVATAR_PUBLIC_PATH } from './constants/avatars.constants';

@Injectable()
export class AvatarsService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async uploadProfileImage(userId: string, file: Express.Multer.File) {
    // 교체 전 파일을 지우려면 지금 값을 먼저 알아둬야 한다.
    const [previous] = await this.db
      .select({ imageKey: user.imageKey, imageSource: user.imageSource })
      .from(user)
      .where(eq(user.id, userId));

    await mkdir(AVATAR_DIR, { recursive: true });

    // 원본 이름을 쓰지 않는다. 경로 조작을 막고 파일명 충돌 방지.
    // 확장자는 FileTypeValidationPipe 가 매직 넘버로 교정해둔 값이라 신뢰 가능
    const filename = `${randomUUID()}${extname(file.originalname)}`;
    await writeFile(join(AVATAR_DIR, filename), file.buffer);

    const image = `${AUTH_SERVER_URL}${AVATAR_PUBLIC_PATH}/${filename}`;

    await this.db
      .update(user)
      .set({ image, imageKey: filename, imageSource: 'upload' })
      .where(eq(user.id, userId));

    // 예전에 직접 올린 파일만 지운다.
    // 구글 등 외부 이미지는 우리가 가진 파일이 아니라 imageKey 도 없다.
    if (previous?.imageSource === 'upload' && previous.imageKey) {
      await rm(join(AVATAR_DIR, previous.imageKey), { force: true });
    }

    return { image };
  }
}
