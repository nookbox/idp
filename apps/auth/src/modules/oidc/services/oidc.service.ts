import { env } from '@/config/oidc-config';
import { Database, DATABASE } from '@/database/database.types';
import { jwks } from '@/database/schema';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as crypto from 'crypto';
import { eq } from 'drizzle-orm';
import * as jose from 'jose';
import { OidcClientReader } from '../readers/oidc-client.reader';
import { AppLogger, RequestContext } from '@/common/logger';
import { AuthorizeQueryDto } from '../dto/authorize-query.dto';

@Injectable()
export class OidcService implements OnModuleInit {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly oidcClientReader: OidcClientReader,
    private readonly appLogger: AppLogger,
  ) {
    this.appLogger.setContext(OidcService.name);
  }

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

  async authorize(ctx: RequestContext, query: AuthorizeQueryDto) {
    const {
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: responseType,
      scope,
      code_challenge: codeChallenge,
      code_challenge_method: codeChallengeMethod,
    } = query;

    const RPClient = await this.oidcClientReader.getByClientId(clientId);

    if (!RPClient) {
      this.appLogger.warn(ctx, '등록되지 않은 client_id', { clientId });
      return 'client_Unregistered';
    }

    if (!RPClient.redirectUris.includes(redirectUri)) {
      this.appLogger.warn(ctx, '등록되지 않은 redirect_uri', {
        clientId,
        redirectUri,
      });
      return 'redirect_uri_mismatch';
    }

    if (responseType !== 'code') {
      this.appLogger.warn(ctx, '지원되지 않는 response_type', {
        clientId,
        responseType,
      });

      return 'unsupported_response_type';
    }

    // 공백 구분 목록이라 단어 단위로 비교 ("openidx" 같은 부분 일치 방지)
    if (!scope?.split(' ').includes('openid')) {
      this.appLogger.warn(ctx, 'scope 에 openid 없음', { clientId, scope });

      return 'invalid_scope';
    }

    if (!codeChallenge || codeChallengeMethod !== 'S256') {
      this.appLogger.warn(ctx, 'PKCE 파라미터 누락 또는 S256 아님', {
        clientId,
        codeChallengeMethod,
      });

      return 'invalid_request';
    }

    return RPClient;
  }
}
