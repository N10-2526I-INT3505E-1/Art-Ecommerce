import { int, numeric, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-typebox';
import { t } from 'elysia';
import { usersTable } from '../users/user.model.ts';

export const paymentsTable = sqliteTable(
	'payments', {
		id: int().primaryKey({ autoIncrement: true }),
		order_id: int().notNull(),
		amount: numeric().notNull(),
		payment_gateway: text().notNull(),
		transaction_id: text(),
		status: text().notNull(),
		created_at: text()
			.notNull()
			.default(sql`CURRENT_TIMESTAMP`),
		updated_at: text()
			.notNull()
			.default(sql`(CURRENT_TIMESTAMP)`)
			.$onUpdate(() => sql`(CURRENT_TIMESTAMP)`),
	}
);
export const schema = { paymentsTable } as const;

export type Table = typeof paymentsTable;

// Schema for the incoming request body
export const createPaymentBodySchema = t.Object({
	order_id: t.Integer({
		minimum: 1,
		error: "A valid 'orderId' is required."
	}),
	// We accept amount in cents (as an integer) to avoid float issues
	amount: t.Integer({
		minimum: 0,
		error: "'amount' must be a integer >= 0."
	}),
	payment_gateway: t.String()
});

// Schema for a successful response
export const paymentResponseSchema = t.Object({
	id: t.Integer(),
	order_id: t.Integer(),
	amount: t.String(), // Numeric is returned as a string
	payment_gateway: t.String(),
	status: t.String(),
	paymentUrl: t.String()
});

// Schema for an error response
export const errorResponseSchema = t.Object({
	error: t.String()
});
const paymentStatusSchema = t.Union([
	t.Literal('completed'),
	t.Literal('failed'),
	t.Literal('cancelled')
], {
	error: "Status must be one of 'completed', 'failed', or 'cancelled'."
});


// --- 1. Schema for URL Parameters ---
export const updatePaymentParamsSchema = t.Object({
	id: t.Numeric({ 
		minimum: 1,
		error: "A valid payment 'id' is required in the URL."
	})
});


// --- 2. Schema for the Request Body ---
export const updatePaymentBodySchema = t.Object({
	status: paymentStatusSchema
});


// --- 3. Schema for the Successful (200 OK) Response ---
export const updatePaymentResponseSchema = t.Object({
	id: t.Integer(),
	order_id: t.Integer(),
	amount: t.String(), 
	payment_gateway: t.String(),
	status: t.String() 
});