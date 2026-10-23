import { boolean, jsonb, pgTable, text } from 'drizzle-orm/pg-core';
import type { JWK } from 'jose';
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
