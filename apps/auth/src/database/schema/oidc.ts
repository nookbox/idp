import { pgTable, text, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';
import type { JWK } from 'jose';

export const jwks = pgTable('jwks', {
  kid: text('kid').primaryKey(),
  publicJwk: jsonb('public_jwk').$type<JWK>().notNull(),
  privateJwk: jsonb('private_jwk').$type<JWK>().notNull(),
  active: boolean('active').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
