import { DATABASE, type Database } from '@/database/database.types';
import { User, user } from '@/database/schema';
import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

@Injectable()
export class UsersRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async findUserById(userId: string): Promise<User | null> {
    const [row] = await this.db
      .select()
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    return row ?? null;
  }
}
