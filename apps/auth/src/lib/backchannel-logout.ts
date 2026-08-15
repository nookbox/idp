import { eq, inArray } from 'drizzle-orm';

import {
  oauthAccessToken,
  oauthClient,
  oauthRefreshToken,
} from '../database/schema';
import { db } from '../database/client';

const BACKCHANNEL_LOGOUT_EVENT =
  'http://schemas.openid.net/event/backchannel-logout';

/** RP 가 죽어 있어도 로그아웃 자체는 끝나야 하므로 짧게 끊는다. */
const NOTIFY_TIMEOUT_MS = 5000;

const LOGOUT_TOKEN_TTL_SECONDS = 120; // 2분

function issuer(): string {
  const base = process.env.BETTER_AUTH_URL ?? 'http://localhost:3001';
  return `${base}/api/auth`;
}

export interface BackchannelTarget {
  clientId: string;
  uri: string;
}

/**
 * 이 세션에서 실제로 토큰을 발급받은 client id 들.
 *
 * access token 만 보면 안 된다. 만료분이 정리됐거나 RP 가 revoke 를 부르면
 * 행이 사라지는데, refresh token 은 revoked 로 남아 있어 더 오래 간다.
 * 반대로 offline_access 를 안 쓰는 RP 는 refresh token 이 아예 없다.
 * 둘 다 봐야 빠뜨리지 않는다.
 */
async function findSessionClientIds(sessionId: string): Promise<string[]> {
  const [access, refresh] = await Promise.all([
    db
      .select({ clientId: oauthAccessToken.clientId })
      .from(oauthAccessToken)
      .where(eq(oauthAccessToken.sessionId, sessionId)),
    db
      .select({ clientId: oauthRefreshToken.clientId })
      .from(oauthRefreshToken)
      .where(eq(oauthRefreshToken.sessionId, sessionId)),
  ]);

  return [...new Set([...access, ...refresh].map((row) => row.clientId))];
}

/**
 * 이 세션에 참여했고, metadata.backchannel_logout_uri 를 등록한 살아있는 client.
 *
 * ⚠️ 세션 행이 지워지기 _전에_ 불러야 한다. oauth_access_token.session_id 와
 *    oauth_refresh_token.session_id 가 둘 다 onDelete: 'set null' 이라,
 *    삭제 후에 부르면 링크가 끊겨서 아무것도 안 나온다.
 */
export async function findBackchannelTargets(
  sessionId: string,
): Promise<BackchannelTarget[]> {
  const clientIds = await findSessionClientIds(sessionId);
  if (clientIds.length === 0) return [];

  const clients = await db
    .select({
      clientId: oauthClient.clientId,
      disabled: oauthClient.disabled,
      metadata: oauthClient.metadata,
    })
    .from(oauthClient)
    .where(inArray(oauthClient.clientId, clientIds));

  return clients.flatMap((client) => {
    if (client.disabled) return [];

    const metadata = client.metadata as Record<string, unknown> | null;
    const uri = metadata?.backchannel_logout_uri;

    if (typeof uri !== 'string' || !uri) return [];

    return [{ clientId: client.clientId, uri }];
  });
}

async function notifyOne(
  target: BackchannelTarget,
  userId: string,
  sessionId: string,
): Promise<void> {
  const { auth } = await import('./auth');

  const now = Math.floor(Date.now() / 1000);

  // 스펙상 logout_token 에 nonce 를 넣으면 안 된다(id_token 과 혼동 방지).
  const { token } = await auth.api.signJWT({
    body: {
      payload: {
        iss: issuer(),
        aud: target.clientId,
        sub: userId,
        sid: sessionId,
        iat: now,
        exp: now + LOGOUT_TOKEN_TTL_SECONDS,
        jti: crypto.randomUUID(),
        events: { [BACKCHANNEL_LOGOUT_EVENT]: {} },
      },
    },
  });

  const response = await fetch(target.uri, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ logout_token: token }).toString(),
    signal: AbortSignal.timeout(NOTIFY_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`RP 가 ${response.status} 로 응답했습니다`);
  }
}

/**
 * 삭제된 세션 하나를 그 세션에 참여했던 RP 에 통지.
 *
 * targets 는 findBackchannelTargets 로 삭제 _전에_ 뽑아둔 것이어야 한다.
 */
export async function notifyBackchannelLogout(session: {
  id: string;
  userId: string;
  targets: BackchannelTarget[];
}): Promise<void> {
  if (session.targets.length === 0) return;

  // 호출부가 void 로 던진다. 여기서 새어나가면 unhandled rejection 이다.
  try {
    await Promise.all(
      session.targets.map(async (target) => {
        try {
          await notifyOne(target, session.userId, session.id);
        } catch (error) {
          console.error(
            `[backchannel-logout] ${target.clientId} 통지 실패:`,
            error,
          );
        }
      }),
    );
  } catch (error) {
    console.error('[backchannel-logout] 통지 실패:', error);
  }
}
