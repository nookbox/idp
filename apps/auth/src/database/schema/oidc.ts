import {
  boolean,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
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

// RP 하나 (등록할 때 1번 생김)
export const oidcClients = pgTable('oidc_clients', {
  clientId: text('client_id').primaryKey(),
  clientSecretHash: text('client_secret_hash').notNull(),
  redirectUris: text('redirect_uris').array().notNull(),
  name: text('name').notNull(), // RP client name
  skipConsent: boolean('skip_consent').default(false).notNull(),
  ...timestamps,
});

// code 발급 1번 (로그인할 때마다 생김)
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
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(), // 발급+ 5분
  usedAt: timestamp('used_at', { withTimezone: true }), // null = 아직 안 씀
  ...timestamps,
});

// 사용자가 client 에 허락한 scope (user + client 당 1행)
// 다시 /authorize 가 오면 "요청 scope 가 여기 안에 다 들어 있나" 로 동의 화면을 건너뛴다
export const oidcConsents = pgTable(
  'oidc_consents',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    clientId: text('client_id')
      .notNull()
      .references(() => oidcClients.clientId, { onDelete: 'cascade' }),
    scope: text('scope').notNull(), // 'openid email' 처럼 공백으로 이어 붙인 문자열
    ...timestamps,
  },
  (t) => [primaryKey({ columns: [t.userId, t.clientId] })],
);

export type OidcClientRow = typeof oidcClients.$inferSelect;
export type OidcAuthorizationCodesRow =
  typeof oidcAuthorizationCodes.$inferSelect;
export type OidcConsentRow = typeof oidcConsents.$inferSelect;
