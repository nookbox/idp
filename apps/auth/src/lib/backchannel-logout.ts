import { oauthClient } from '../database/schema';
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

interface BackchannelTarget {
  clientId: string;
  uri: string;
}

/** metadata.backchannel_logout_uri 를 등록한, 살아있는 client 만 추린다. */
async function findTargets(): Promise<BackchannelTarget[]> {
  const clients = await db
    .select({
      clientId: oauthClient.clientId,
      disabled: oauthClient.disabled,
      metadata: oauthClient.metadata,
    })
    .from(oauthClient);

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
 * 삭제된 세션 하나를 등록된 모든 RP 에 통지
 */
export async function notifyBackchannelLogout(session: {
  id: string;
  userId: string;
}): Promise<void> {
  try {
    const targets = await findTargets();
    if (targets.length === 0) return;

    await Promise.all(
      targets.map(async (target) => {
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
    console.error('[backchannel-logout] 통지 대상 조회 실패:', error);
  }
}
