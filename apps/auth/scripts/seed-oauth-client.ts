/**
 * OAuth Client(RP) 시드 스크립트.
 *
 * 실행:
 *   pnpm tsx scripts/seed-oauth-client.ts
 *
 * 동작:
 *   1) 시드용 admin 유저(SEED_EMAIL)를 가입시키거나, 이미 있으면 그대로 사용.
 *   2) 해당 유저로 로그인해 세션 쿠키를 얻는다.
 *      adminCreateOAuthClient 가 assertClientPrivileges → 세션 필수라 우회 불가.
 *   3) CLIENTS 배열을 순회하면서 세션 헤더를 실어 RP client 들을 등록한다.
 *      이미 같은 이름으로 등록되어 있으면 그 client 는 스킵(멱등).
 *
 * 출력: 새로 등록된 client 들의 client_id / client_secret 평문.
 *       client_secret 은 최초 생성 시에만 노출되므로 즉시 해당 RP .env 에 복사할 것.
 *
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ client 추가/구성 가이드 — 잠깐 멈추고 읽기                                      │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 *   하나의 OAuth client = 하나의 서비스(RP 앱). 서비스가 늘어나면 CLIENTS
 *   배열에 새 항목을 추가하면 된다. 한 client 의 redirect_uris 는 같은 서비스의
 *   여러 환경(dev/staging/prod) 만 묶는 용도.
 *
 *   ✅ GOOD — 서비스별로 분리, 환경은 배열에 추가:
 *     [
 *       { name: 'Nook Backend',   redirect_uris: [':4000/cb', 'https://api.nook.com/cb'] },
 *       { name: 'Studio Backend', redirect_uris: [':5001/cb', 'https://api.studio.com/cb'] },
 *     ]
 *
 *   redirect_uris 는 OAuth 로그인 callback URL, post_logout_redirect_uris 는
 *   로그아웃 완료 후 브라우저가 돌아갈 URL 이다. 여러 URL 은 콤마로 구분한다.
 *
 *     NOOK_OAUTH_CALLBACK_URIS=http://localhost:4000/cb,https://api.nook.com/cb
 *     NOOK_POST_LOGOUT_REDIRECT_URIS=http://localhost:3030,https://nook.com
 *
 *   ❌ BAD — 한 client 에 여러 서비스 URL 을 몰아넣음:
 *     { name: 'All Services', redirect_uris: [':4000/cb', ':5001/cb', ':6000/cb'] }
 *     → 모든 서비스가 같은 client_secret 공유 → 한 곳 침해 시 도미노
 *     → IdP 입장에서 "어느 서비스 호출인지" 구분 불가
 *     → 한 서비스 revoke = 전체 다 끊김
 */
import 'dotenv/config';
import { eq } from 'drizzle-orm';

import { auth } from '../src/lib/auth';
import { db, sql } from '../src/database/client';
import { oauthClient } from '../src/database/schema';

interface ClientSeed {
  name: string;
  redirect_uris: string[];
  skip_consent?: boolean;
  require_pkce?: boolean;
  enable_end_session?: boolean;
  post_logout_redirect_uris?: string[];
  token_endpoint_auth_method?:
    | 'client_secret_post'
    | 'client_secret_basic'
    | 'none';
  type?: 'web' | 'native' | 'user-agent-based';
}

function readUrlListEnv(name: string, fallback: string[]): string[] {
  const raw = process.env[name];

  if (!raw) {
    return fallback;
  }

  return raw
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean);
}

// 등록할 OAuth client 목록. 새 서비스 추가 시 여기에 새 항목 push.
const CLIENTS: ClientSeed[] = [
  {
    name: 'Nook Backend',
    redirect_uris: readUrlListEnv('NOOK_OAUTH_CALLBACK_URIS', [
      'http://localhost:4000/api/auth/oauth2/callback/nook-auth',
    ]),
    skip_consent: true, // first-party RP → consent 화면 스킵
    require_pkce: true,
    enable_end_session: true,
    post_logout_redirect_uris: readUrlListEnv(
      'NOOK_POST_LOGOUT_REDIRECT_URIS',
      ['http://localhost:3030'],
    ),
  },
  // 새 서비스가 생기면 client 를 추가:
  // {
  //   name: 'Studio Backend',
  //   redirect_uris: readUrlListEnv('STUDIO_OAUTH_CALLBACK_URIS', [
  //     'http://localhost:5001/auth/callback',
  //   ]),
  //   skip_consent: true,
  //   require_pkce: true,
  //   enable_end_session: true,
  //   post_logout_redirect_uris: readUrlListEnv(
  //     'STUDIO_POST_LOGOUT_REDIRECT_URIS',
  //     ['http://localhost:3031'],
  //   ),
  // },
  // 외부 파트너용 (consent 화면을 사용자에게 보여줘야 함):
  // {
  //   name: 'Acme Integration',
  //   redirect_uris: ['https://acme.example.com/auth/callback'],
  //   skip_consent: false,
  //   require_pkce: true,
  // },
];

const SEED_EMAIL = 'admin@local.com';
const SEED_PASSWORD =
  process.env.SEED_ADMIN_PASSWORD ?? 'seed-admin-password-change-me';
const SEED_NAME = 'Seed Admin';

async function applyClientLogoutConfig(
  clientId: string,
  cfg: ClientSeed,
): Promise<void> {
  const updates = {
    ...(cfg.enable_end_session !== undefined
      ? { enableEndSession: cfg.enable_end_session }
      : {}),
    ...(cfg.post_logout_redirect_uris !== undefined
      ? { postLogoutRedirectUris: cfg.post_logout_redirect_uris }
      : {}),
    updatedAt: new Date(),
  };

  if (
    cfg.enable_end_session === undefined &&
    cfg.post_logout_redirect_uris === undefined
  ) {
    return;
  }

  await db
    .update(oauthClient)
    .set(updates)
    .where(eq(oauthClient.clientId, clientId));
}

async function ensureSeedUserSessionCookie(): Promise<string> {
  // 가입 시도. 이미 존재하면 better-auth 가 USER_ALREADY_EXISTS 류 에러를 던지므로 삼킨다.
  try {
    await auth.api.signUpEmail({
      body: { email: SEED_EMAIL, password: SEED_PASSWORD, name: SEED_NAME },
    });
  } catch {
    // 이미 가입된 케이스
  }

  // 로그인해서 Set-Cookie 헤더를 얻는다.
  const response = await auth.api.signInEmail({
    body: { email: SEED_EMAIL, password: SEED_PASSWORD },
    asResponse: true,
  });

  const setCookie = response.headers.get('set-cookie');
  if (!setCookie) {
    throw new Error(
      '로그인 응답에 Set-Cookie 가 없습니다. SEED_ADMIN_PASSWORD 가 기존 시드 유저 비밀번호와 일치하는지 확인하세요.',
    );
  }
  // Set-Cookie 한 줄에서 쿠키 부분(`name=value`)만 추출
  const cookieHeader = setCookie
    .split(/,(?=[^;]+=[^;]+;)/) // 다중 Set-Cookie 안전 분리
    .map((s) => s.split(';')[0].trim())
    .join('; ');
  return cookieHeader;
}

async function seedOne(cfg: ClientSeed, cookie: string): Promise<void> {
  const [existing] = await db
    .select()
    .from(oauthClient)
    .where(eq(oauthClient.name, cfg.name))
    .limit(1);

  if (existing) {
    await applyClientLogoutConfig(existing.clientId, cfg);
    console.log(`\n[skip] "${cfg.name}" 은 이미 등록되어 있습니다.`);
    console.log({
      client_id: existing.clientId,
      redirect_uris: existing.redirectUris,
      skip_consent: existing.skipConsent,
      enable_end_session: cfg.enable_end_session ?? existing.enableEndSession,
      post_logout_redirect_uris:
        cfg.post_logout_redirect_uris ?? existing.postLogoutRedirectUris,
    });
    return;
  }

  const created = await auth.api.adminCreateOAuthClient({
    body: {
      client_name: cfg.name,
      redirect_uris: cfg.redirect_uris,
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method:
        cfg.token_endpoint_auth_method ?? 'client_secret_post',
      type: cfg.type ?? 'web',
      skip_consent: cfg.skip_consent ?? false,
      require_pkce: cfg.require_pkce ?? true,
    },
    headers: new Headers({ cookie }),
  });

  await applyClientLogoutConfig(created.client_id, cfg);

  console.log(`\n[created] "${cfg.name}" ===`);
  console.log(`  client_id     = ${created.client_id}`);
  console.log(`  client_secret = ${created.client_secret}`);
  console.log(
    `  → 위 값을 해당 RP 의 .env 에 즉시 복사하세요 (secret 은 1회만 노출).`,
  );
}

async function main(): Promise<void> {
  if (CLIENTS.length === 0) {
    console.log('등록할 client 가 없습니다. CLIENTS 배열을 확인하세요.');
    return;
  }

  const cookie = await ensureSeedUserSessionCookie();

  for (const cfg of CLIENTS) {
    await seedOne(cfg, cookie);
  }

  console.log('\n=== 공통 RP 설정 ===');
  console.log(
    `OIDC_ISSUER=${process.env.BETTER_AUTH_URL ?? 'http://localhost:3001'}/api/auth`,
  );
  console.log(
    '\n잃어버린 client_secret 은 복원 불가. oauth_client 테이블에서 해당 row 를',
  );
  console.log('삭제하고 이 스크립트를 다시 실행해 새로 발급받으세요.');
}

main()
  .catch((err) => {
    console.error('\nseed failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sql.end({ timeout: 5 });
  });
