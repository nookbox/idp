import { AppLogger, RequestContext } from '@/common/logger';
import { OidcAuthorizationCodesRow } from '@/database/schema';
import { Injectable, Logger } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import * as jose from 'jose';
import { encryptPrivateJwk } from '../crypto/signing-key-cipher';
import { AuthorizeQueryDto } from '../dto/authorize-query.dto';
import { OidcReader } from '../readers/oidc.reader';
import { OidcRepository } from '../repositories/oidc.repository';

export type IssueCodeInput = {
  clientId: string;
  userId: string;
  redirectUri: string;
  scope: string;
  nonce?: string;
  codeChallenge: string;
  authTime: Date;
};

const CODE_TTL_SECONDS = 300;

// base64url(sha256(code_verifier)) 는 패딩 없이 항상 43자
const S256_CODE_CHALLENGE = /^[A-Za-z0-9_-]{43}$/;

// 검증 + 비즈니스 로직 + DB 쓰기.
// OIDC 엔드포인트는 에러 응답 모양이 스펙으로 정해져 있어서(302 error / { error }),
// 실패는 throw 하지 않고 이유 문자열로 돌려준다. 컨트롤러가 그걸 보고 응답 모양을 정한다.
@Injectable()
export class OidcManager {
  // onModuleInit 처럼 요청이 없는 곳에서 쓰는 로거
  private readonly logger = new Logger(OidcManager.name);

  constructor(
    private readonly oidcRepository: OidcRepository,
    private readonly oidcReader: OidcReader,
    private readonly appLogger: AppLogger,
  ) {
    this.appLogger.setContext(OidcManager.name);
  }

  // ─────────────────────────────────────────
  // 서명 키: 활성 키가 없으면 새로 만든다 (단계 3)
  // ─────────────────────────────────────────
  async ensureSigningKey() {
    const activeKey = await this.oidcRepository.findActiveSigningKey();
    if (activeKey) return;

    this.logger.warn('활성화된 JWKS 키를 찾을 수 없습니다.');

    const { publicKey, privateKey } = await jose.generateKeyPair('RS256', {
      extractable: true,
    });

    const publicJwk = await jose.exportJWK(publicKey);
    const privateJwk = await jose.exportJWK(privateKey);

    const encryptedPrivateJwk = await encryptPrivateJwk(privateJwk);

    await this.oidcRepository.insertSigningKey({
      kid: crypto.randomUUID(),
      publicJwk,
      privateJwk: encryptedPrivateJwk,
      active: true,
    });

    this.logger.log(`새로운 JWKS 키 생성되었습니다.`);
  }

  // ─────────────────────────────────────────
  // /authorize 파라미터 검증 (단계 4 ②)
  // ─────────────────────────────────────────
  async validateAuthorizeRequest(
    ctx: RequestContext,
    query: AuthorizeQueryDto,
  ) {
    const {
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: responseType,
      scope,
      code_challenge: codeChallenge,
      code_challenge_method: codeChallengeMethod,
    } = query;

    const RPClient = await this.oidcReader.getClient(clientId);

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

    if (
      !codeChallenge ||
      !S256_CODE_CHALLENGE.test(codeChallenge) ||
      codeChallengeMethod !== 'S256'
    ) {
      this.appLogger.warn(ctx, 'PKCE 파라미터 누락, 형식 오류 또는 S256 아님', {
        clientId,
        codeChallengeMethod,
      });

      return 'invalid_request';
    }

    return { scope, codeChallenge };
  }

  // ─────────────────────────────────────────
  // authorization code 발급 (단계 4 ④)
  // ─────────────────────────────────────────
  async issueAuthorizationCode(input: IssueCodeInput) {
    const code = crypto.randomBytes(48).toString('base64url');
    const codeHash = crypto
      .createHash('sha256')
      .update(code)
      .digest('base64url');

    // 5분
    const expiresAt = new Date(Date.now() + CODE_TTL_SECONDS * 1000);

    await this.oidcRepository.insertAuthorizationCode({
      codeHash,
      clientId: input.clientId,
      userId: input.userId,
      redirectUri: input.redirectUri,
      scope: input.scope,
      nonce: input.nonce,
      codeChallenge: input.codeChallenge,
      authTime: input.authTime,
      expiresAt,
    });

    return code;
  }

  // ─────────────────────────────────────────
  // /token client 인증 (단계 5 ②)
  // ─────────────────────────────────────────
  async authenticateClient(clientId: string, clientSecret: string) {
    const RPClient = await this.oidcReader.getClient(clientId);

    if (!RPClient) return 'unknown_client';

    // bcrypt.compare 가 받은 원문을 저장된 해시의 salt 로 다시 해시해 비교한다 (상수시간 비교 포함)
    const same = await bcrypt.compare(clientSecret, RPClient.clientSecretHash);

    if (!same) return 'secret_mismatch';

    return RPClient;
  }

  async validateCode(
    code: string,
    clientId: string,
    redirectUri: string,
    codeVerifier: string,
  ): Promise<OidcAuthorizationCodesRow | string> {
    const codeHash = crypto
      .createHash('sha256')
      .update(code)
      .digest('base64url');

    const authCode = await this.oidcReader.getCodeByHash(codeHash);
    if (!authCode) return 'code_not_found';

    // 만료
    const expiresAtMs = authCode.expiresAt.getTime();
    const nowMs = Date.now();
    if (expiresAtMs <= nowMs) {
      return 'code_expired';
    }
    // 4. 이미 씀   → 'code_already_used'
    if (authCode.usedAt) {
      return 'code_already_used';
    }
    // 5. client    → 'client_mismatch'
    if (clientId !== authCode.clientId) return 'client_mismatch';
    // 6. redirect  → 'redirect_uri_mismatch'
    if (redirectUri !== authCode.redirectUri) return 'redirect_uri_mismatch';
    // 7. PKCE      → 'pkce_mismatch'
    const computedChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    if (computedChallenge !== authCode.codeChallenge) return 'pkce_mismatch';

    // 8. 사용 처리 → 검사를 다 통과한 뒤, 토큰 만들기 전에.
    // 동시에 온 다른 요청이 먼저 썼으면(4번은 둘 다 통과) 여기서 걸린다
    const marked = await this.oidcRepository.markCodeUsed(codeHash);
    if (!marked) return 'code_already_used';

    return authCode;
  }
}
