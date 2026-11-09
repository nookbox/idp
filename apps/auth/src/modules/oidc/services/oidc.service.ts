import { RequestContext } from '@/common/logger';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { Request } from 'express';
import { AuthorizeQueryDto } from '../dto/authorize-query.dto';
import { IssueCodeInput, OidcManager } from '../managers/oidc.manager';
import { CurrentUserReader } from '../readers/current-user.reader';
import { OidcReader } from '../readers/oidc.reader';
import { OidcAuthorizationCodesRow } from '@/database/schema';

// 흐름만 표현한다 (메서드당 2~3줄). 검증·판단·DB 접근은 Reader/Manager 에.
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
}
