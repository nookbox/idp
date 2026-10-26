import { boolean, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { InferSelectModel } from 'drizzle-orm';
import { timestamps } from './timestamps';

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'), // 이미지 절대 URL
  imageKey: text('image_key'),
  imageSource: text('image_source'), // 'upload' | 'google' | null
  marketingConsent: boolean('marketing_consent').default(false).notNull(),
  role: text('role'),
  banned: boolean('banned').default(false),
  banReason: text('ban_reason'),
  banExpires: timestamp('ban_expires'),
  ...timestamps,
});

export type User = InferSelectModel<typeof user>;
