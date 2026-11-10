import { env } from '@/config/oidc-config';
import { User } from '@/database/schema';
import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { UsersReader } from '../../users/readers/users.reader';

@Injectable()
export class CurrentUserReader {
  constructor(private readonly usersReader: UsersReader) {}

  //Phase 2 전까지 env 의 개발용 사용자를 "로그인한 사람"으로 대신한다.
  // 진짜 세션이 생기면 getCurrentUser 안만 바꾸고, 세션 모듈로 옮긴다.
  async getCurrentUser(req: Request): Promise<User | null> {
    if (!env.DEV_LOGIN_USER_ID) {
      return null;
    }

    return this.usersReader.getUser(env.DEV_LOGIN_USER_ID);
  }
}
