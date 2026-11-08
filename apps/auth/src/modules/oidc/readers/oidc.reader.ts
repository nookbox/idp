import { OidcAuthorizationCodesRow, OidcClientRow } from '@/database/schema';
import { Injectable } from '@nestjs/common';
import { OidcRepository } from '../repositories/oidc.repository';

// 조회 전용. Service 와 Repository 사이에서 "찾아서 응답 모양으로 돌려주기"만 한다.
@Injectable()
export class OidcReader {
  constructor(private readonly repo: OidcRepository) {}

  getClient(clientId: string): Promise<OidcClientRow | null> {
    return this.repo.findClientById(clientId);
  }

  // GET /jwks 응답: 공개키만, kid·alg·use 는 응답 때 붙인다 (3-4)
  async getPublicKeys() {
    const rows = await this.repo.findAllPublicKeys();

    return {
      keys: rows.map(({ publicJwk, kid }) => ({
        ...publicJwk,
        kid,
        alg: 'RS256',
        use: 'sig',
      })),
    };
  }

  async getCodeByHash(
    codeHash: string,
  ): Promise<OidcAuthorizationCodesRow | null> {
    return this.repo.findCodeByHash(codeHash);
  }
}
