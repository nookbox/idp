import { DATABASE, type Database } from '@/database/database.types';
import { oidcAuthorizationCodes } from '@/database/schema';
import { Inject, Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

export type IssueCodeInput = {
  clientId: string;
  userId: string;
  redirectUri: string;
  scope: string;
  nonce?: string;
  codeChallenge: string;
  authTime: Date;
};

const CODE_TTL_SECONDS = 300;

@Injectable()
export class OidcManager {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async issueAuthorizationCode(input: IssueCodeInput) {
    const code = crypto.randomBytes(48).toString('base64url');
    const codeHash = crypto
      .createHash('sha256')
      .update(code)
      .digest('base64url');

    // 5분
    const expiresAt = new Date(Date.now() + CODE_TTL_SECONDS * 1000);

    await this.db.insert(oidcAuthorizationCodes).values({
      codeHash,
      clientId: input.clientId,
      userId: input.userId,
      redirectUri: input.redirectUri,
      scope: input.scope,
      nonce: input.nonce,
      codeChallenge: input.codeChallenge,
      authTime: input.authTime,
      expiresAt,
    });

    return code;
  }
}
