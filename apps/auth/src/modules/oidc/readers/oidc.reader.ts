import { OidcAuthorizationCodesRow, OidcClientRow } from '@/database/schema';
import { Injectable } from '@nestjs/common';
import { webcrypto } from 'crypto';
import * as jose from 'jose';
import { decryptPrivateJwk } from '../crypto/signing-key-cipher';
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

  async getSigningKey(): Promise<{
    kid: string;
    privateKey: webcrypto.CryptoKey | Uint8Array<ArrayBufferLike>;
  } | null> {
    const row = await this.repo.findActiveSigningKey();
    if (!row) return null;

    // 복호화(암호화한 키를 다시 되돌림)
    // { kty: 'RSA', n: '...', d: '...' }  ← 그냥 객체
    const privateJwk = await decryptPrivateJwk(row.privateJwk);

    // 변환(그냥 객체 → 서명할 수 있는 키 객체로)
    const privateKey = await jose.importJWK(privateJwk, 'RS256');

    return { kid: row.kid, privateKey };
  }
}
