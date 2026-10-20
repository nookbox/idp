import { pgTable, text, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';
import type { JWK } from 'jose';

export const jwks = pgTable('jwks', {
  kid: text('kid').primaryKey(),
  publicJwk: jsonb('public_jwk').$type<JWK>().notNull(),
  privateJwk: text('private_jwk').notNull(), // JWE 문자열(JWKS_ENCRYPTION_KEY 로 암호화). 바로 쓰지 말고 복호화 후 사용
  active: boolean('active').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
