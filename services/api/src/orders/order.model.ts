import { sql } from 'drizzle-orm';
import { check, int, numeric, sqliteTable, text } from 'drizzle-orm/sqlite-core';
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

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ordersTable = sqliteTable(
	'orders',
	{
		id: text().primaryKey(),
		user_id: text().notNull(),
		total_amount: numeric().notNull().$type<number>(),
		status: text('status', { length: 50 }).notNull().$type<OrderStatus>(),
		shipping_address: text().notNull(),
		created_at: text()
			.notNull()
			.default(sql`CURRENT_TIMESTAMP`),
		updated_at: text()
			.notNull()
			.default(sql`(CURRENT_TIMESTAMP)`)
			.$onUpdate(() => sql`(CURRENT_TIMESTAMP)`),
	},

	(table) => [
		check(
			'orders_status_check',
			sql`${table.status} IN ('pending','paid','processing','shipped','delivered','cancelled')`,
		),
	],
);

export const schema = { ordersTable } as const;

export const UserAddressSchema = t.Object({
	address: t.String({ minLength: 5, maxLength: 255 }),
	phone: t.String({ maxLength: 10, pattern: '^[0-9]{9,11}$', error: 'Invalid phone number' }),
	ward: t.String({ maxLength: 100 }),
	state: t.String({ maxLength: 100 }),
	postal_code: t.Optional(t.Union([t.String({ maxLength: 20 }), t.Null()])),
	country: t.String({ maxLength: 100 }),
	is_default: t.Optional(t.Integer({ minimum: 0, maximum: 1, default: 0 })),
});
/** Create schema (request body) */
export const CreateOrderSchema = createInsertSchema(ordersTable, {
	user_id: t.String(),
	total_amount: t.Number({ minimum: 0 }),
	status: t.UnionEnum(['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled']),
	shipping_address: t.Union([t.String(), UserAddressSchema]),
});

/** Order Item in creation request */
export const OrderItemInputSchema = t.Object({
	product_id: t.String(),
	quantity: t.Integer({ minimum: 1 }),
	price_per_item: t.Number({ minimum: 0 }),
	product_snapshot: t.Optional(t.Record(t.String(), t.Any())),
});



/** Create Order with Items schema */
export const CreateOrderWithItemsSchema = t.Object({
	user_id: t.String(),
	total_amount: t.Number({ minimum: 0 }),
	status: t.Optional(t.UnionEnum(['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'])),
	shipping_address: t.Union([t.String(), UserAddressSchema]),
	items: t.Optional(t.Array(OrderItemInputSchema)),
});



export const OrderResponseSchema = createSelectSchema(ordersTable);
export type Table = typeof ordersTable;
export type CreateOrderInput = typeof CreateOrderSchema extends infer R ? R : unknown;
