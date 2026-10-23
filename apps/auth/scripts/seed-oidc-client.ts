/**
 * 테스트용 RP(oidc_clients) 등록.
 *
 * 실행 (apps/auth 에서):
 *   pnpm tsx --env-file=.env scripts/seed-oidc-client.ts
 *
 * client_secret 원문은 처음 등록할 때 한 번만 출력된다. DB 에는 해시만 저장한다.
 * 이미 등록돼 있으면 아무것도 바꾸지 않는다. secret 을 다시 받으려면 행을 지우고 재실행.
 */
import * as crypto from 'crypto';
import { db, sql } from '../src/database/client';
import { oidcClients } from '../src/database/schema';

const CLIENT = {
  clientId: 'shop',
  name: 'Shop',
  redirectUris: ['http://localhost:4000/callback'],
};

async function main() {
  const secret = crypto.randomBytes(32).toString('base64url');
  const clientSecretHash = crypto
    .createHash('sha256')
    .update(secret)
    .digest('base64url');

  const inserted = await db
    .insert(oidcClients)
    .values({ ...CLIENT, clientSecretHash })
    .onConflictDoNothing()
    .returning({ clientId: oidcClients.clientId });

  // 이미 있으면 방금 만든 secret 은 DB 해시와 짝이 아니다 → 출력하면 안 된다
  if (inserted.length === 0) {
    console.log(`이미 등록됨: ${CLIENT.clientId} (secret 은 다시 보여줄 수 없음)`);
    return;
  }

  console.log('등록 완료. 아래 값을 RP 의 .env 에 복사하세요 (다시 볼 수 없음):');
  console.log(`CLIENT_ID=${CLIENT.clientId}`);
  console.log(`CLIENT_SECRET=${secret}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
