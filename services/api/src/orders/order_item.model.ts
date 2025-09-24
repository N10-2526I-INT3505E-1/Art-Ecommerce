// order_items.model.ts
import { int, sqliteTable, numeric, text } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-typebox';
import { t } from 'elysia';

export const orderItemsTable = sqliteTable('order_items', {
  id: int().primaryKey({ autoIncrement: true }),
  order_id: int().notNull(),
  product_id: int().notNull(),
  quantity: int().notNull(),
  // tell TS it's number in code
  price_per_item: numeric().notNull().$type<number>(),
  // store JSON as TEXT in sqlite; in TS we treat DB column as string
  product_snapshot: text().$type<string | null>().notNull(),
});

export const schema = { orderItemsTable } as const;

export const CreateOrderItemSchema = createInsertSchema(orderItemsTable, {
  order_id: t.Integer(),
  product_id: t.Integer(),
  quantity: t.Integer({ minimum: 1 }),
  price_per_item: t.Number({ minimum: 0 }),
  // on API level accept a record (object) — route will stringify it
  product_snapshot: t.Optional(t.Record(t.String(), t.Any())),
});

export const OrderItemResponseSchema = createSelectSchema(orderItemsTable);
export type Table = typeof orderItemsTable;
