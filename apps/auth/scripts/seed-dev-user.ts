/**
 * 개발용 사용자(user) 등록. 로그인/세션이 생기기 전(Phase 2)까지 "로그인한 사람"으로 쓴다.
 *
 * 실행 (apps/auth 에서):
 *   pnpm tsx --env-file=.env scripts/seed-dev-user.ts
 *
 * 이미 있으면 그대로 둔다. id 는 비밀값이 아니라서 매번 출력한다.
 */
import { db, sql } from '../src/database/client';
import { user } from '../src/database/schema';

const DEV_USER = {
  id: 'dev-user',
  name: 'Dev User',
  email: 'dev@localhost',
};

async function main() {
  const inserted = await db
    .insert(user)
    .values(DEV_USER)
    .onConflictDoNothing()
    .returning({ id: user.id });

  console.log(inserted.length ? '등록 완료' : `이미 등록됨: ${DEV_USER.id}`);
  console.log('.env 에 추가하세요:');
  console.log(`DEV_LOGIN_USER_ID=${DEV_USER.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
