import { DATABASE, type Database } from '@/database/database.types';
import {
  jwks,
  oidcAuthorizationCodes,
  OidcAuthorizationCodesRow,
  OidcClientRow,
  oidcClients,
  user,
} from '@/database/schema';
import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';

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

  async findAllPublicKeys() {
    return await this.db
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

  async findCodeByHash(
    codeHash: string,
  ): Promise<OidcAuthorizationCodesRow | null> {
    const [row] = await this.db
      .select()
      .from(oidcAuthorizationCodes)
      .where(eq(oidcAuthorizationCodes.codeHash, codeHash))
      .limit(1);

    return row ?? null;
  }

  // 아직 안 쓴 code 일 때만 used_at 을 채운다. 바뀐 행이 있으면 true.
  // WHERE used_at IS NULL 이라 같은 code 로 동시에 두 요청이 와도 하나만 성공한다
  async markCodeUsed(codeHash: string): Promise<boolean> {
    const rows = await this.db
      .update(oidcAuthorizationCodes)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(oidcAuthorizationCodes.codeHash, codeHash),
          isNull(oidcAuthorizationCodes.usedAt),
        ),
      )
      .returning({ codeHash: oidcAuthorizationCodes.codeHash });

    return rows.length > 0;
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
