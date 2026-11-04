import { Global, Module } from '@nestjs/common';
import { OidcController } from './controllers/oidc.controller';
import { OidcManager } from './managers/oidc.manager';
import { CurrentUserReader } from './readers/current-user.reader';
import { OidcReader } from './readers/oidc.reader';
import { OidcRepository } from './repositories/oidc.repository';
import { OidcService } from './services/oidc.service';

@Global()
@Module({
  controllers: [OidcController],
  providers: [
    OidcService,
    OidcManager,
    OidcReader,
    CurrentUserReader,
    OidcRepository,
  ],
})
export class OidcModule {}
