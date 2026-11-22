/**
 * 테스트용 RP(oidc_clients) 등록.
 *
 * 실행 (apps/auth 에서):
 *   pnpm tsx --env-file=.env scripts/seed-oidc-client.ts
 *
 * client_secret 원문은 처음 등록할 때 한 번만 출력된다. DB 에는 해시만 저장한다.
 * 이미 등록돼 있으면 secret 은 바꾸지 않는다(다시 받으려면 행을 지우고 재실행). skipConsent 만 아래 값으로 맞춘다.
 */
import bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { db, sql } from '../src/database/client';
import { oidcClients } from '../src/database/schema';

const CLIENT = {
  clientId: 'shop',
  name: 'Shop',
  redirectUris: ['http://localhost:4000/callback'],
  // 자사(1st party) 테스트 RP → 동의 화면 생략. token·userinfo e2e 가 이 client 로 code 를 바로 받는다 (단계 8)
  skipConsent: true,
};

async function main() {
  const secret = crypto.randomBytes(32).toString('base64url');
  // bcrypt: salt 를 자동으로 만들어 해시 안에 같이 저장한다 (cost 10)
  const clientSecretHash = await bcrypt.hash(secret, 10);

  const inserted = await db
    .insert(oidcClients)
    .values({ ...CLIENT, clientSecretHash })
    .onConflictDoNothing()
    .returning({ clientId: oidcClients.clientId });

  // 이미 있으면 방금 만든 secret 은 DB 해시와 짝이 아니다 → 출력하면 안 된다
  if (inserted.length === 0) {
    // 이미 있는 행(컬럼 추가 전에 등록된 것 포함)도 skipConsent 는 맞춰 둔다
    await db
      .update(oidcClients)
      .set({ skipConsent: CLIENT.skipConsent })
      .where(eq(oidcClients.clientId, CLIENT.clientId));

    console.log(
      `이미 등록됨: ${CLIENT.clientId} (secret 은 다시 보여줄 수 없음, skipConsent=${CLIENT.skipConsent} 로 맞춤)`,
    );
    return;
  }

  console.log(
    '등록 완료. 아래 값을 RP 의 .env 에 복사하세요 (다시 볼 수 없음):',
  );
  console.log(`CLIENT_ID=${CLIENT.clientId}`);
  console.log(`CLIENT_SECRET=${secret}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
