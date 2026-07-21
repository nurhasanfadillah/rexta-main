import {
  pgTable,
  text,
  numeric,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core';

// ─── Domain Tables ────────────────────────────────────────────────────────

export const categories = pgTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const products = pgTable('products', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  categoryId: text('category_id').references(() => categories.id, { onDelete: 'set null' }),
  priceCmt: numeric('price_cmt').default('0'),
  hpp: numeric('hpp').default('0'),
  stock: numeric('stock').default('0'),
  isFavorite: boolean('is_favorite').default(false),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const materials = pgTable('materials', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  unit: text('unit').notNull(),
  price: numeric('price').default('0'),
  stock: numeric('stock').default('0'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const transactions = pgTable('transactions', {
  id: text('id').primaryKey(),
  itemId: text('item_id').notNull(),
  itemType: text('item_type').notNull(),
  type: text('type').notNull(),
  qty: numeric('qty').notNull(),
  date: timestamp('date', { withTimezone: true }).notNull(),
  notes: text('notes'),
  balanceAfter: numeric('balance_after').notNull(),
});

// ─── Better Auth Tables ───────────────────────────────────────────────────
// Column names HARUS exact match dengan yang Better Auth buat di DB.
// Better Auth v1 menggunakan camelCase column names.

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
});
