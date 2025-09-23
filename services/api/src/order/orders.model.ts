// orders.model.ts
import { int, sqliteTable, text, numeric } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-typebox';
import { t } from 'elysia';

export const ordersTable = sqliteTable('orders', {
  id: int().primaryKey({ autoIncrement: true }),
  user_id: int().notNull(),
  // important: tell TS this numeric column uses number in code
  total_amount: numeric().notNull().$type<number>(),
  status: text('status', { length: 50 }).notNull(),
  shipping_address: text().notNull(),
  created_at: text().notNull().default(sql`CURRENT_TIMESTAMP`),
  updated_at: text()
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`)
    .$onUpdate(() => sql`(CURRENT_TIMESTAMP)`),
});

export const schema = { ordersTable } as const;

export const CreateOrderSchema = createInsertSchema(ordersTable, {
  user_id: t.Integer(),
  total_amount: t.Number({ minimum: 0 }),
  status: t.String({ minLength: 1, maxLength: 50 }),
  shipping_address: t.String({ minLength: 5 }),
});

export const OrderResponseSchema = createSelectSchema(ordersTable);
export type Table = typeof ordersTable;
