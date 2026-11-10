import { Module } from '@nestjs/common';
import { UsersReader } from './readers/users.reader';
import { UsersRepository } from './repositories/users.repository';

@Module({
  providers: [UsersReader, UsersRepository],
  exports: [UsersReader],
})
export class UsersModule {}
