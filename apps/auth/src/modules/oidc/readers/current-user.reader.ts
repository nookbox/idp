import { env } from '@/config/oidc-config';
import { Database, DATABASE } from '@/database/database.types';
import { user, User } from '@/database/schema';
import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { Request } from 'express';

@Injectable()
export class CurrentUserReader {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  //Phase 2 전까지 env 의 개발용 사용자를 "로그인한 사람"으로 대신한다.
  // 진짜 세션이 생기면 getCurrentUser 안만 바꾸고, 세션 모듈로 옮긴다.
  async getCurrentUser(req: Request): Promise<User | null> {
    if (!env.DEV_LOGIN_USER_ID) {
      return null;
    }

    const [userInfo] = await this.db
      .select()
      .from(user)
      .where(eq(user.id, env.DEV_LOGIN_USER_ID))
      .limit(1);

    return userInfo || null;
  }
}
