// orders.model.ts
import { check, int, sqliteTable, text, numeric } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-typebox';
import { t } from 'elysia';

export const ORDER_STATUSES = [
  'pending',
  'paid',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
] as const;

export type OrderStatus = typeof ORDER_STATUSES[number];

export const ordersTable = sqliteTable(
  'orders',
  {
    id: int().primaryKey({ autoIncrement: true }),
    user_id: int().notNull(),
    total_amount: numeric().notNull().$type<number>(),
    // gán type tại level column để TS biết rõ
    status: text('status', { length: 50 }).notNull().$type<OrderStatus>(),
    shipping_address: text().notNull(),
    created_at: text().notNull().default(sql`CURRENT_TIMESTAMP`),
    updated_at: text()
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`)
      .$onUpdate(() => sql`(CURRENT_TIMESTAMP)`),
  },

  (table) => [
    check(
      'orders_status_check',
      sql`${table.status} IN ('pending','paid','processing','shipped','delivered','cancelled')`
    ),
  ]
);

export const schema = { ordersTable } as const;

/** Create schema (request body) */
export const CreateOrderSchema = createInsertSchema(ordersTable, {
  user_id: t.Integer(),
  total_amount: t.Number({ minimum: 0 }),
  status: t.UnionEnum(['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled']),
  shipping_address: t.String({ minLength: 5 }),
});

export const OrderResponseSchema = createSelectSchema(ordersTable);
export type Table = typeof ordersTable;
export type CreateOrderInput = typeof CreateOrderSchema extends infer R ? R : unknown;
