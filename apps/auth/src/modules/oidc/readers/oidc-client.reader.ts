import { Database, DATABASE } from '@/database/database.types';
import { oidcClients } from '@/database/schema';
import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

@Injectable()
export class OidcClientReader {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async getByClientId(clientId: string) {
    const [client] = await this.db
      .select()
      .from(oidcClients)
      .where(eq(oidcClients.clientId, clientId))
      .limit(1);

    return client;
  }
}
