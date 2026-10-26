import { createRequestContext } from '@/common/request-context/util';
import { env } from '@/config/oidc-config';
import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { OidcService } from '../services/oidc.service';
import { AuthorizeQueryDto } from '../dto/authorize-query.dto';

@Controller('oidc')
export class OidcController {
  constructor(private readonly oidcService: OidcService) {}
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
      const url = new URL(query.redirect_uri);
      url.searchParams.set('error', result);
      if (query.state) url.searchParams.set('state', query.state);

      // 302 Location: http://localhost:4000/callback?error=invalid_scope&state=a1b2
      return res.redirect(302, url.toString());
    }

    res.send('ok');
  }
}
