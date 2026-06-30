import { Global, Module, OnApplicationShutdown } from '@nestjs/common';
import { db, sql, type Database } from './client';

export const DATABASE = Symbol('DATABASE');
export type { Database };

@Global()
@Module({
  providers: [
    {
      provide: DATABASE,
      useValue: db,
    },
  ],
  exports: [DATABASE],
})
export class DatabaseModule implements OnApplicationShutdown {
  async onApplicationShutdown() {
    await sql.end({ timeout: 5 });
  }
}
