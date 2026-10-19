import { Controller, Get } from '@nestjs/common';
import { env } from '@/config/oidc-config';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';

@Controller('oidc')
export class OidcController {
  @AllowAnonymous()
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
}
