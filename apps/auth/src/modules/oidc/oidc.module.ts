import { Global, Module } from '@nestjs/common';
import { OidcController } from './controllers/oidc.controller';

@Global()
@Module({
  controllers: [OidcController],
  providers: [],
})
export class OidcModule {}
