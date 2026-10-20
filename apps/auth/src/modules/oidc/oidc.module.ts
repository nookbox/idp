import { Global, Module } from '@nestjs/common';
import { OidcController } from './controllers/oidc.controller';
import { OidcService } from './services/oidc.service';

@Global()
@Module({
  controllers: [OidcController],
  providers: [OidcService],
})
export class OidcModule {}
