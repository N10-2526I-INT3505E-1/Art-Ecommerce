// order_items.model.ts
import { int, numeric, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-typebox';
import { t } from 'elysia';
import { ordersTable } from './order.model'; 

export const orderItemsTable = sqliteTable('order_items', {
  id: int().primaryKey({ autoIncrement: true }),
  
  order_id: text()
    .notNull()
    // Dòng này tạo liên kết khóa ngoại trong Database
    .references(() => ordersTable.id, { onDelete: 'cascade' }), 
    
  product_id: text().notNull(),
  quantity: int().notNull(),
  price_per_item: numeric().notNull().$type<number>(),
  product_snapshot: text().$type<string | null>().notNull(),
});

export const schema = { orderItemsTable } as const;

export const CreateOrderItemSchema = createInsertSchema(orderItemsTable, {
  order_id: t.Integer(),
  product_id: t.String(),
  quantity: t.Integer({ minimum: 1 }),
  price_per_item: t.Number({ minimum: 0 }),
  // on API level accept a record (object) — route will stringify it
  product_snapshot: t.Optional(t.Record(t.String(), t.Any())),
});

export const OrderItemResponseSchema = createSelectSchema(orderItemsTable);
export type Table = typeof orderItemsTable;
