import { User } from '@/database/schema';
import { Injectable } from '@nestjs/common';
import { UsersRepository } from '../repositories/users.repository';

// 사용자 조회 전용. 다른 모듈(oidc 등)은 이 Reader 로만 사용자를 읽는다.
@Injectable()
export class UsersReader {
  constructor(private readonly repo: UsersRepository) {}

  getUser(userId: string): Promise<User | null> {
    return this.repo.findUserById(userId);
  }
}
