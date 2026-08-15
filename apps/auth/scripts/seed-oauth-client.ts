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
 *   backchannel_logout_uri 만 성격이 다르다. 위 둘은 브라우저가 가는 곳이라
 *   한 client 가 dev/prod 주소를 함께 들고 있어도 되지만, 이건 IdP 서버가
 *   직접 POST 하는 주소라 지금 떠 있는 환경의 것 하나만 유효하다.
 *   그래서 콤마 목록이 아니라 단일 URL 이다.
 *
 *     NOOK_BACKCHANNEL_LOGOUT_URI=http://nookbox-server:4000/api/auth/backchannel-logout
 *
 *   RP 가 여러 개면 client 마다 자기 변수를 갖는다(NOOK_*, STUDIO_*, ...).
 *   통지는 끝난 세션에서 실제로 토큰을 발급받은 client 에만 간다. 등록만 해두고
 *   유저가 로그인한 적 없는 RP 는 통지를 받지 않는다.
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
import { oauthClient, user } from '../src/database/schema';

interface ClientSeed {
  name: string;
  redirect_uris: string[];
  skip_consent?: boolean;
  require_pkce?: boolean;
  enable_end_session?: boolean;
  post_logout_redirect_uris?: string[];
  /**
   * IdP 가 이 RP 에 back-channel logout 을 POST 할 주소.
   * 등록하지 않으면 통지를 받지 않는다(옵트인). 받을 서버가 없는 RP는 비워둔다.
   *
   * 이 값을 넣으면 enable_end_session 도 true 여야 한다(id_token 의 sid 가 필요).
   * assertLogoutConfigConsistent 참고.
   *
   * ⚠️ 이건 브라우저가 아니라 IdP 서버가 부르는 주소다. nookbox 처럼 같은
   *    docker 네트워크(nook-edge)에 있으면 컨테이너 이름으로 바로 부를 수 있어
   *    터널에 경로를 뚫지 않아도 된다:
   *      http://nookbox-server:4000/api/auth/backchannel-logout
   *    외부 RP 라면 공개 https 주소를 쓴다.
   */
  backchannel_logout_uri?: string;
  token_endpoint_auth_method?:
    'client_secret_post' | 'client_secret_basic' | 'none';
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
    backchannel_logout_uri:
      process.env.NOOK_BACKCHANNEL_LOGOUT_URI ??
      'http://localhost:4000/api/auth/backchannel-logout',
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
  //   // RP 마다 자기 변수를 갖는다. 하나의 변수에 콤마로 몰지 않는다.
  //   backchannel_logout_uri:
  //     process.env.STUDIO_BACKCHANNEL_LOGOUT_URI ??
  //     'http://localhost:5001/api/auth/backchannel-logout',
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

/**
 * back-channel logout 을 쓰려면 enable_end_session 이 반드시 같이 켜져 있어야 한다.
 *
 * id_token 의 sid 는 enable_end_session 이 true 인 client 에만 실린다
 * (@better-auth/oauth-provider 의 createIdToken). 그런데 logout_token 에는
 * enable_end_session 과 무관하게 sid 와 sub 가 둘 다 들어간다.
 *
 * 그래서 backchannel_logout_uri 만 켜고 enable_end_session 을 빠뜨리면:
 *   로그인 시 sid 를 못 받음 → RP 가 sid ↔ 자기 세션 매핑을 만들 수 없음
 *   → logout_token 의 sid 를 못 알아봄 → sub 로 폴백
 *   → 노트북에서 로그아웃했는데 폰까지 같이 끊긴다.
 *
 * 에러 없이 세션 정책만 조용히 뒤집히는 종류의 사고라, 시드 단계에서 막는다.
 */
function assertLogoutConfigConsistent(clients: ClientSeed[]): void {
  const broken = clients.filter(
    (cfg) => cfg.backchannel_logout_uri !== undefined && !cfg.enable_end_session,
  );

  if (broken.length === 0) return;

  const names = broken.map((cfg) => `  - ${cfg.name}`).join('\n');
  throw new Error(
    'backchannel_logout_uri 를 등록한 client 는 enable_end_session: true 여야 합니다.\n' +
      `${names}\n` +
      'enable_end_session 이 꺼져 있으면 id_token 에 sid 가 실리지 않아 RP 가 세션 단위\n' +
      '로그아웃을 할 수 없고, sub 폴백으로 전 기기가 함께 로그아웃됩니다.\n' +
      '세션 단위 로그아웃이 필요 없다면 backchannel_logout_uri 를 지우세요.',
  );
}

async function applyClientLogoutConfig(
  clientId: string,
  cfg: ClientSeed,
): Promise<void> {
  if (
    cfg.enable_end_session === undefined &&
    cfg.post_logout_redirect_uris === undefined &&
    cfg.backchannel_logout_uri === undefined
  ) {
    return;
  }

  // metadata 는 jsonb 라 통째로 덮으면 다른 키가 날아간다. 읽어서 병합한다.
  let metadata: Record<string, unknown> | undefined;
  if (cfg.backchannel_logout_uri !== undefined) {
    const [existing] = await db
      .select({ metadata: oauthClient.metadata })
      .from(oauthClient)
      .where(eq(oauthClient.clientId, clientId))
      .limit(1);

    metadata = {
      ...((existing?.metadata as Record<string, unknown> | null) ?? {}),
      backchannel_logout_uri: cfg.backchannel_logout_uri,
    };
  }

  const updates = {
    ...(cfg.enable_end_session !== undefined
      ? { enableEndSession: cfg.enable_end_session }
      : {}),
    ...(cfg.post_logout_redirect_uris !== undefined
      ? { postLogoutRedirectUris: cfg.post_logout_redirect_uris }
      : {}),
    ...(metadata !== undefined ? { metadata } : {}),
    updatedAt: new Date(),
  };

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

  // 시드 유저를 admin 으로 승격시킨다.
  // oauthProvider 의 clientPrivileges 가 role === 'admin' 만 통과시키므로
  // 이 단계가 없으면 아래 adminCreateOAuthClient 가 401 로 막힌다.
  // role 은 better-auth 쪽에서 input:false 라 가입 요청으로는 못 넣고,
  // /admin/set-role 을 부르려면 이미 admin 이어야 해서 DB 로 직접 심는다.
  await db
    .update(user)
    .set({ role: 'admin' })
    .where(eq(user.email, SEED_EMAIL));

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
      backchannel_logout_uri: cfg.backchannel_logout_uri,
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

  // DB 를 건드리기 전에 검사한다. 절반만 반영된 상태를 만들지 않기 위해서다.
  assertLogoutConfigConsistent(CLIENTS);

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
