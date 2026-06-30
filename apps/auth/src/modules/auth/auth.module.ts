import { Global, Module } from '@nestjs/common';
import { auth } from '../../lib/auth';

export const AUTH = Symbol('AUTH');

@Global()
@Module({
  providers: [
    {
      provide: AUTH,
      useValue: auth,
    },
  ],
  exports: [AUTH],
})
export class AuthModule {}
