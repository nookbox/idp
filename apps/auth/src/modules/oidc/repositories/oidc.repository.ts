import { DATABASE, type Database } from '@/database/database.types';
import {
  jwks,
  oidcAuthorizationCodes,
  oidcClients,
  user,
} from '@/database/schema';
import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

export type OidcClientRow = typeof oidcClients.$inferSelect;
type JwksInsert = typeof jwks.$inferInsert;
type AuthorizationCodeInsert = typeof oidcAuthorizationCodes.$inferInsert;

// OIDC 도메인의 DB 접근을 한 곳에 모은다 (테이블별이 아니라 도메인별 1개).
// 판단은 하지 않는다. 찾아서 돌려주거나, 받은 값을 그대로 쓴다.
@Injectable()
export class OidcRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  // ─────────────────────────────────────────
  // 서명 키 (jwks)
  // ─────────────────────────────────────────
  async findActiveSigningKey() {
    const [row] = await this.db
      .select()
      .from(jwks)
      .where(eq(jwks.active, true))
      .limit(1);

    return row ?? null;
  }

  findAllPublicKeys() {
    return this.db
      .select({ kid: jwks.kid, publicJwk: jwks.publicJwk })
      .from(jwks);
  }

  async insertSigningKey(values: JwksInsert) {
    await this.db.insert(jwks).values(values);
  }

  // ─────────────────────────────────────────
  // 등록된 RP (oidc_clients)
  // ─────────────────────────────────────────
  async findClientById(clientId: string): Promise<OidcClientRow | null> {
    const [row] = await this.db
      .select()
      .from(oidcClients)
      .where(eq(oidcClients.clientId, clientId))
      .limit(1);

    return row ?? null;
  }

  // ─────────────────────────────────────────
  // authorization code
  // ─────────────────────────────────────────
  async insertAuthorizationCode(values: AuthorizationCodeInsert) {
    await this.db.insert(oidcAuthorizationCodes).values(values);
  }

  // ─────────────────────────────────────────
  // 사용자
  // ─────────────────────────────────────────
  async findUserById(userId: string) {
    const [row] = await this.db
      .select()
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    return row ?? null;
  }
}
