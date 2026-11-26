import { RequestContext } from '@/common/logger';
import { OidcAuthorizationCodesRow } from '@/database/schema';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { Request } from 'express';
import { AuthorizeQueryDto } from '../dto/authorize-query.dto';
import { ConsentBodyDto } from '../dto/consent.dto';
import { OidcManager } from '../managers/oidc.manager';
import { CurrentUserReader } from '../readers/current-user.reader';
import { OidcReader } from '../readers/oidc.reader';
import type { IssueRefreshTokenInput } from '../types/oidc.types';
import { IssueCodeInput } from '../types/oidc.types';
@Injectable()
export class OidcService implements OnModuleInit {
  private readonly logger = new Logger(OidcService.name);

  constructor(
    private readonly manager: OidcManager,
    private readonly reader: OidcReader,
    private readonly currentUserReader: CurrentUserReader,
  ) {}

  // 서버가 뜨기 전 데이터베이스 연결 확인, 초기 데이터 적재 등 수행
  async onModuleInit() {
    this.logger.log('모듈 초기화 완료: onModuleInit 실행됨');
    await this.manager.ensureSigningKey();
  }

  getPublicKeys() {
    return this.reader.getPublicKeys();
  }

  authorize(ctx: RequestContext, query: AuthorizeQueryDto) {
    return this.manager.validateAuthorizeRequest(ctx, query);
  }

  getCurrentUser(req: Request) {
    return this.currentUserReader.getCurrentUser(req);
  }

  needsConsent(clientId: string, userId: string, scope: string) {
    return this.manager.needsConsent(clientId, userId, scope);
  }

  makeConsentUrl(query: AuthorizeQueryDto, userId: string) {
    return this.manager.makeConsentUrl(query, userId);
  }

  decideConsent(ctx: RequestContext, body: ConsentBodyDto, userId: string) {
    return this.manager.decideConsent(ctx, body, userId);
  }

  issueAuthorizationCode(input: IssueCodeInput) {
    return this.manager.issueAuthorizationCode(input);
  }

  authenticateClient(clientId: string, clientSecret: string) {
    return this.manager.authenticateClient(clientId, clientSecret);
  }

  validateCode(
    code: string,
    clientId: string,
    redirectUri: string,
    codeVerifier: string,
  ) {
    return this.manager.validateCode(code, clientId, redirectUri, codeVerifier);
  }

  async issueIdToken(authCode: OidcAuthorizationCodesRow): Promise<string> {
    return await this.manager.issueIdToken(authCode);
  }

  async issueAccessToken(authCode: OidcAuthorizationCodesRow): Promise<string> {
    return await this.manager.issueAccessToken(authCode);
  }

  async issueRefreshToken(input: IssueRefreshTokenInput) {
    return await this.manager.issueRefreshToken(input);
  }

  userInfo(accessToken: string) {
    return this.manager.getUserInfo(accessToken);
  }
  revokeConsent(userId: string, clientId: string) {
    return this.manager.revokeConsent(userId, clientId);
  }
}
