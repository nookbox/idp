import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { extname, join } from 'path';

const UPLOAD_DIR = './uploads/avatars';

@Injectable()
export class AvatarsService {
  async uploadProfileImage(userId: string, file: Express.Multer.File) {
    await mkdir(UPLOAD_DIR, { recursive: true });

    const filename = `${randomUUID()}${extname(file.originalname)}`;
    const filePath = join(UPLOAD_DIR, filename);

    await writeFile(filePath, file.buffer);

    // TODO: DB에 filePath 저장
    return { message: 'Profile image uploaded successfully', filePath };
  }
}
