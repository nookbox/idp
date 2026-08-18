import { Global, Module, OnApplicationShutdown } from '@nestjs/common';
import { db, sql } from './client';
import { DATABASE } from './database.types';

export { DATABASE };
export type { Database } from './database.types';

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
