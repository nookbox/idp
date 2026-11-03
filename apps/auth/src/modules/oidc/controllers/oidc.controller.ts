import { AppLogger } from '@/common/logger';
import { createRequestContext } from '@/common/request-context/util';
import { env } from '@/config/oidc-config';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthorizeQueryDto } from '../dto/authorize-query.dto';
import { TokenRequestDto } from '../dto/token.dto';
import { OidcManager } from '../managers/oidc.manager';
import { CurrentUserReader } from '../readers/current-user.reader';
import { OidcService } from '../services/oidc.service';

@Controller('oidc')
export class OidcController {
  constructor(
    private readonly oidcService: OidcService,
    private readonly currentUserReader: CurrentUserReader,
    private readonly oidcManager: OidcManager,
    private readonly appLogger: AppLogger,
  ) {
    this.appLogger.setContext(OidcController.name);
  }
  @Get('.well-known/openid-configuration')
  getOidc() {
    return {
      issuer: env.OIDC_ISSUER,
      authorization_endpoint: `${env.OIDC_ISSUER}/authorize`,
      token_endpoint: `${env.OIDC_ISSUER}/token`,
      userinfo_endpoint: `${env.OIDC_ISSUER}/userinfo`,
      jwks_uri: `${env.OIDC_ISSUER}/jwks`,
      response_types_supported: ['code'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['RS256'],
      scopes_supported: ['openid', 'profile', 'email', 'offline_access'],
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['client_secret_basic'],
    };
  }

  @Get('jwks')
  getJwks() {
    return this.oidcService.getPublicKeys();
  }

  @Get('authorize')
  async authorize(
    @Req() req: Request,
    @Res() res: Response,
    @Query() query: AuthorizeQueryDto,
  ) {
    const ctx = createRequestContext(req);
    const result = await this.oidcService.authorize(ctx, query);

    // redirect_uri 를 아직 못 믿으니 IdP 가 직접 응답
    if (result === 'client_Unregistered') {
      throw new BadRequestException('OIDC 클라이언트를 찾을 수 없습니다.');
    }
    if (result === 'redirect_uri_mismatch') {
      throw new BadRequestException('redirect_uri가 일치하지 않습니다.');
    }

    //  검증된 redirect_uri 로 error 를 들려 RP 에 돌려보냄
    if (typeof result === 'string') {
      return this.redirectRP(res, query.redirect_uri, {
        error: result,
        state: query.state,
      });
    }

    const currentUser = await this.currentUserReader.getCurrentUser(req);

    if (!currentUser) {
      return this.redirectRP(res, query.redirect_uri, {
        error: 'login_required',
        state: query.state,
      });
    }

    const code = await this.oidcManager.issueAuthorizationCode({
      clientId: query.client_id,
      userId: currentUser.id,
      redirectUri: query.redirect_uri,
      scope: result.scope,
      nonce: query.nonce,
      codeChallenge: result.codeChallenge,
      authTime: new Date(),
    });

    return this.redirectRP(res, query.redirect_uri, {
      code,
      state: query.state,
    });
  }

  private redirectRP(
    res: Response,
    redirectUri: string,
    params: Record<string, string | undefined>,
  ) {
    const url = new URL(redirectUri);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) url.searchParams.set(key, value);
    }

    return res.redirect(302, url.toString());
  }

  @HttpCode(200)
  @Post('token')
  async token(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: TokenRequestDto,
  ) {
    const ctx = createRequestContext(req);

    const { grant_type, code, redirect_uri, code_verifier } = body;

    if (!grant_type) {
      this.appLogger.warn(ctx, 'invalid_request', { missing: 'grant_type' });

      return res.status(400).json({ error: 'invalid_request' });
    }

    if (grant_type && grant_type !== 'authorization_code') {
      this.appLogger.warn(ctx, 'unsupported_grant_type');

      return res.status(400).json({ error: 'unsupported_grant_type' });
    }

    if (!code) {
      this.appLogger.warn(ctx, 'invalid_request', { missing: 'code' });

      return res.status(400).json({ error: 'invalid_request' });
    }

    if (!redirect_uri) {
      this.appLogger.warn(ctx, 'invalid_request', { missing: 'redirect_uri' });
      return res.status(400).json({ error: 'invalid_request' });
    }

    if (!code_verifier) {
      this.appLogger.warn(ctx, 'invalid_request', { missing: 'code_verifier' });
      return res.status(400).json({ error: 'invalid_request' });
    }

    return res.json('ok');
  }
}
