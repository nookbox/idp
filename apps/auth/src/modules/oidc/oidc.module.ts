import { Global, Module } from '@nestjs/common';
import { OidcController } from './controllers/oidc.controller';
import { CurrentUserReader } from './readers/current-user.reader';
import { OidcClientReader } from './readers/oidc-client.reader';
import { OidcService } from './services/oidc.service';

@Global()
@Module({
  controllers: [OidcController],
  providers: [OidcService, OidcClientReader, CurrentUserReader],
})
export class OidcModule {}
