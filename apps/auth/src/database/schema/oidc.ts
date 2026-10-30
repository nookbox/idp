import { boolean, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import type { JWK } from 'jose';
import { user } from './auth';
import { timestamps } from './timestamps';

export const jwks = pgTable('jwks', {
  kid: text('kid').primaryKey(),
  publicJwk: jsonb('public_jwk').$type<JWK>().notNull(),
  privateJwk: text('private_jwk').notNull(), // JWE 문자열(JWKS_ENCRYPTION_KEY 로 암호화). 바로 쓰지 말고 복호화 후 사용
  active: boolean('active').default(false).notNull(),
  ...timestamps,
});

export const oidcClients = pgTable('oidc_clients', {
  clientId: text('client_id').primaryKey(),
  clientSecretHash: text('client_secret_hash').notNull(),
  redirectUris: text('redirect_uris').array().notNull(),
  name: text('name').notNull(), // RP client name
  ...timestamps,
});

export const oidcAuthorizationCodes = pgTable('oidc_authorization_code', {
  codeHash: text('code_hash').primaryKey(),
  clientId: text('client_id')
    .notNull()
    .references(() => oidcClients.clientId),
  userId: text('user_id')
    .notNull()
    .references(() => user.id),
  redirectUri: text('redirect_uri').notNull(),
  scope: text('scope').notNull(),
  nonce: text('nonce'), // RP 가 안 보낼 수도 있음
  codeChallenge: text('code_challenge').notNull(),
  authTime: timestamp('auth_time', { withTimezone: true }).notNull(), // 로그인한 시각
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(), // 발급 + 1분
  usedAt: timestamp('used_at', { withTimezone: true }), // null = 아직 안 씀
  ...timestamps,
});
