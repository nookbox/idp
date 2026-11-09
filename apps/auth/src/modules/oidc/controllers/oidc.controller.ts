import { AppLogger, RequestContext } from '@/common/logger';
import { createRequestContext } from '@/common/request-context/util';
import { env } from '@/config/oidc-config';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Headers,
  HttpCode,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthorizeQueryDto } from '../dto/authorize-query.dto';
import { TokenRequestDto, TokenResDto } from '../dto/token.dto';
import { OidcService } from '../services/oidc.service';
import { OAuthErrorRes } from '../dto/oauth-error.dto';

@Controller('oidc')
export class OidcController {
  constructor(
    private readonly oidcService: OidcService,
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

    const currentUser = await this.oidcService.getCurrentUser(req);

    if (!currentUser) {
      return this.redirectRP(res, query.redirect_uri, {
        error: 'login_required',
        state: query.state,
      });
    }

    const code = await this.oidcService.issueAuthorizationCode({
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

  @HttpCode(200)
  @Post('token')
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  async token(
    @Req() req: Request,
    @Res() res: Response<TokenResDto | OAuthErrorRes>,
    @Body() body: TokenRequestDto,
    @Headers('authorization') authHeader?: string,
  ) {
    const ctx = createRequestContext(req);

    const { grant_type, code, redirect_uri, code_verifier } = body;

    if (!authHeader) {
      return this.invalidClient(res, ctx, 'no_authorization_header');
    }

    if (!authHeader.startsWith('Basic ')) {
      return this.invalidClient(res, ctx, 'not_basic_auth');
    }

    // 인증 헤더에서 Basic 인증 정보를 추출하기위해서 인코딩된 문자열 추출함(예: 'Basic bXlDbGllbnRJZDpteUNsaWVudFNlY3JldA==')
    const encoded = authHeader.slice('Basic '.length);

    const decoded = Buffer.from(encoded, 'base64').toString('utf-8');

    const idx = decoded.indexOf(':');

    if (idx < 0) return this.invalidClient(res, ctx, 'no_colon');

    let clientId: string;
    let clientSecret: string;

    try {
      clientId = decodeURIComponent(decoded.slice(0, idx));
      clientSecret = decodeURIComponent(decoded.slice(idx + 1));
    } catch {
      return this.invalidClient(res, ctx, 'bad_url_encoding');
    }

    if (!clientId || !clientSecret)
      return this.invalidClient(res, ctx, 'empty_id_or_secret');

    // 실패면 이유 문자열('unknown_client' | 'secret_mismatch'), 성공이면 client 행
    const client = await this.oidcService.authenticateClient(
      clientId,
      clientSecret,
    );
    if (typeof client === 'string') {
      return this.invalidClient(res, ctx, client);
    }

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

    // 실패면 이유 문자열(code_not_found, pkce_mismatch 등), 성공이면 code 행
    const authCode = await this.oidcService.validateCode(
      code,
      client.clientId,
      redirect_uri,
      code_verifier,
    );
    if (typeof authCode === 'string') {
      this.appLogger.warn(ctx, 'invalid_grant', { reason: authCode });

      return res.status(400).json({ error: 'invalid_grant' });
    }

    const id_token = await this.oidcService.issueIdToken(authCode);
    const access_token = await this.oidcService.issueAccessToken(authCode);

    return res.json({
      access_token,
      token_type: 'Bearer',
      expires_in: 15 * 60, // 15분뒤 만료
      id_token,
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

  private invalidClient(res: Response, ctx: RequestContext, reason?: string) {
    this.appLogger.warn(ctx, 'invalid_client', { reason });
    res.setHeader('WWW-Authenticate', 'Basic realm="OIDC"');
    return res.status(401).json({ error: 'invalid_client' });
  }
}
