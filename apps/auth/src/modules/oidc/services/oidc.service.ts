import { env } from '@/config/oidc-config';
import { Database, DATABASE } from '@/database/database.types';
import { jwks } from '@/database/schema';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as crypto from 'crypto';
import { eq } from 'drizzle-orm';
import * as jose from 'jose';

@Injectable()
export class OidcService implements OnModuleInit {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  private readonly logger = new Logger(OidcService.name);

  // 서버가 뜨기 전 데이터베이스 연결 확인, 초기 데이터 적재 등 수행
  async onModuleInit() {
    this.logger.log('모듈 초기화 완료: onModuleInit 실행됨');

    const [activeKey] = await this.db
      .select()
      .from(jwks)
      .where(eq(jwks.active, true))
      .limit(1);

    if (!activeKey) {
      this.logger.warn('활성화된 JWKS 키를 찾을 수 없습니다.');

      const { publicKey, privateKey } = await jose.generateKeyPair('RS256', {
        extractable: true,
      });

      const publicJwk = await jose.exportJWK(publicKey);
      const privateJwk = await jose.exportJWK(privateKey);

      const encryptedPrivateJwk = await new jose.CompactEncrypt(
        Buffer.from(JSON.stringify(privateJwk)),
      )
        .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
        .encrypt(Buffer.from(env.JWKS_ENCRYPTION_KEY, 'base64'));

      const kid = crypto.randomUUID();

      await this.db.insert(jwks).values({
        kid,
        publicJwk,
        privateJwk: encryptedPrivateJwk,
        active: true,
      });

      this.logger.log(`새로운 JWKS 키 생성되었습니다.`);
    }
  }

  async getPublicKeys() {
    const rows = await this.db
      .select({ kid: jwks.kid, publicJwk: jwks.publicJwk })
      .from(jwks);

    return {
      keys: rows.map(({ publicJwk, kid }) => ({
        ...publicJwk,
        kid,
        alg: 'RS256',
        use: 'sig',
      })),
    };
  }
}
