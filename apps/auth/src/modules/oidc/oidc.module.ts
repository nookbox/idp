import { Global, Module } from '@nestjs/common';
import { OidcController } from './controllers/oidc.controller';
import { OidcClientReader } from './readers/oidc-client.reader';
import { OidcService } from './services/oidc.service';

@Global()
@Module({
  controllers: [OidcController],
  providers: [OidcService, OidcClientReader],
})
export class OidcModule {}
