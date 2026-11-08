import { env } from '@/config/oidc-config';
import * as jose from 'jose';

const encryptionKey = () => Buffer.from(env.JWKS_ENCRYPTION_KEY, 'base64');

export async function encryptPrivateJwk(privateJwk: jose.JWK): Promise<string> {
  return new jose.CompactEncrypt(Buffer.from(JSON.stringify(privateJwk)))
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .encrypt(encryptionKey());
}

export async function decryptPrivateJwk(jwe: string): Promise<jose.JWK> {
  const { plaintext } = await jose.compactDecrypt(jwe, encryptionKey());

  return JSON.parse(new TextDecoder().decode(plaintext)) as jose.JWK;
}
